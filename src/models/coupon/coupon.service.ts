import mongoose, { ClientSession } from "mongoose";
import CouponModel from "./coupon.model";
import OrderModel from "../order/order.model";
import SubCategoryModel from "../subcategory/subcategory.model";

export interface ICartItemForDiscount {
    productId: string | mongoose.Types.ObjectId;
    quantity: number;
    price: number;
}

/**
 * Validates a coupon and calculates the applicable discount amount.
 * Throws an error with a bilingual message if validation fails.
 */
export const validateAndCalculateDiscount = async (params: {
    code: string;
    cartItems: ICartItemForDiscount[];
    userId: string;
    session?: ClientSession;
    isNew?: boolean;
}) => {
    const { code, cartItems, userId, session, isNew = true } = params;

    if (!code) {
        throw new Error("কুপন কোড প্রদান করা হয়নি / Coupon code was not provided");
    }

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        throw new Error("কার্ট খালি বা অবৈধ / Cart is empty or invalid");
    }

    // 1. Fetch Coupon
    const coupon = await CouponModel.findOne({ code: code.toUpperCase() }).session(session || null);
    if (!coupon) {
        throw new Error("অবৈধ বা নিষ্ক্রিয় কুপন / Invalid or inactive coupon");
    }

    if (isNew) {
        if (!coupon.isActive) {
            throw new Error("অবৈধ বা নিষ্ক্রিয় কুপন / Invalid or inactive coupon");
        }

        // 2. Check Validity Dates
        const now = new Date();
        if (now < coupon.validFrom || now > coupon.validUntil) {
            throw new Error("কুপনটির মেয়াদ শেষ বা এখনো কার্যকর হয়নি / Coupon has expired or is not yet active");
        }

        // 3. Check Global Usage Limits
        if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
            throw new Error("কুপন ব্যবহারের সর্বোচ্চ সীমা অতিক্রম করেছে / Coupon usage limit has been reached");
        }

        // 4. Check Per-User Limit (Bug 12)
        if (coupon.perUserLimit > 0) {
            const userUsageCount = await OrderModel.countDocuments({
                userId,
                appliedCoupon: coupon.code,
                order_status: { $ne: "cancelled" }
            }).session(session || null);

            if (userUsageCount >= coupon.perUserLimit) {
                throw new Error(`আপনি এই কুপনটি সর্বোচ্চ ${coupon.perUserLimit} বার ব্যবহার করতে পারবেন / You can use this coupon at most ${coupon.perUserLimit} times`);
            }
        }

        // 5. Check New User Only (Bugs 3, 13)
        if (coupon.isForNewUserOnly) {
            const userOrderCount = await OrderModel.countDocuments({
                userId,
                order_status: { $ne: "cancelled" }
            }).session(session || null);

            if (userOrderCount > 0) {
                throw new Error("এই কুপনটি শুধুমাত্র নতুন গ্রাহকদের জন্য প্রযোজ্য / This coupon is only applicable for new users");
            }
        }
    }

    // 6. Fetch products from DB to prevent client price tampering and get categories/subcategories (Bugs 4, 6)
    const productIds = cartItems.map(item => new mongoose.Types.ObjectId(item.productId.toString()));
    const ProductModel = mongoose.model("Product");
    const dbProducts = await ProductModel.find({ _id: { $in: productIds } }).session(session || null).lean();
    const productMap = new Map<string, any>(dbProducts.map((p: any) => [p._id.toString(), p]));

    // Calculate subtotals
    let totalSubtotal = 0;
    let applicableAmount = 0;
    let isCouponValidForCart = false;

    const couponProdId = coupon.applicableProduct ? coupon.applicableProduct.toString() : null;
    const couponCatId = coupon.applicableCategory ? coupon.applicableCategory.toString() : null;
    const couponSubCatId = coupon.applicableSubCategory ? coupon.applicableSubCategory.toString() : null;
    const isScoped = couponProdId || couponCatId || couponSubCatId;

    // Resolve category → subcategories for category-level coupons.
    // A product only matches a category coupon if it has a subcategory that
    // belongs to the coupon's category. Products tagged with the category
    // but no relevant subcategory (or a subcategory from another category)
    // do not get the discount.
    let couponCategorySubCatIds: Set<string> | null = null;
    if (couponCatId && !couponSubCatId && !couponProdId) {
        const subs = await SubCategoryModel.find({ category: couponCatId })
            .select("_id")
            .session(session || null)
            .lean();
        couponCategorySubCatIds = new Set(subs.map((s: any) => s._id.toString()));
    }

    for (const item of cartItems) {
        const productIdStr = item.productId.toString();
        const dbProduct = productMap.get(productIdStr);

        if (!dbProduct) {
            throw new Error(`পণ্যটি পাওয়া যায়নি / Product not found: ${productIdStr}`);
        }

        // Calculate item total using the price passed in (selling price / cost price based on order type)
        const itemTotal = item.price * item.quantity;
        totalSubtotal += itemTotal;

        if (isScoped) {
            let matches = false;

            if (couponProdId) {
                if (productIdStr === couponProdId) {
                    matches = true;
                }
            } else {
                const productSubCategories = (dbProduct.subCategory || []).map((s: any) => (s._id || s).toString());

                if (couponSubCatId) {
                    if (productSubCategories.includes(couponSubCatId)) {
                        matches = true;
                    }
                } else if (couponCatId && couponCategorySubCatIds) {
                    if (productSubCategories.some((sc: string) => couponCategorySubCatIds!.has(sc))) {
                        matches = true;
                    }
                }
            }

            if (matches) {
                applicableAmount += itemTotal;
                isCouponValidForCart = true;
            }
        }
    }

    if (isScoped && !isCouponValidForCart) {
        throw new Error("এই কুপনটি আপনার কার্টের কোনো পণ্যের জন্য প্রযোজ্য নয় / This coupon is not applicable to any products in your cart");
    }

    if (!isScoped) {
        applicableAmount = totalSubtotal;
    }

    // 7. Check Minimum Order Amount
    if (totalSubtotal < coupon.minOrderAmount) {
        throw new Error(`এই কুপনটির জন্য ন্যূনতম অর্ডার হতে হবে ৳${coupon.minOrderAmount} / Minimum order amount for this coupon is ৳${coupon.minOrderAmount}`);
    }

    // 8. Calculate Discount
    let discountAmount = 0;
    if (coupon.discountType === "flat") {
        discountAmount = coupon.discountAmount;
    } else if (coupon.discountType === "percentage") {
        discountAmount = applicableAmount * (coupon.discountAmount / 100);
        if (coupon.maxDiscountAmount > 0 && discountAmount > coupon.maxDiscountAmount) {
            discountAmount = coupon.maxDiscountAmount;
        }
    }

    // Clamp discount to the applicable amount (especially for flat discounts) (Bug 7)
    if (discountAmount > applicableAmount) {
        discountAmount = applicableAmount;
    }

    // Round discount to 2 decimal places (Bug 22)
    discountAmount = Number(discountAmount.toFixed(2));

    return {
        discountAmount,
        coupon
    };
};
