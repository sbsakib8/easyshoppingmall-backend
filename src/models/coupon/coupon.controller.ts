import { Request, Response } from "express";
import { AuthRequest } from "../../middlewares/isAuth";
import CouponModel from "./coupon.model";
import productModel from "../product/product.model";
import { CartModel } from "../cart/cart.model";
import { validateAndCalculateDiscount } from "./coupon.service";
import mongoose from "mongoose";

// Apply coupon to calculate discount
export const applyCoupon = async (req: AuthRequest, res: Response) => {
    try {
        const { code } = req.body;
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "কুপন ব্যবহার করার জন্য অনুগ্রহ করে সাইন ইন করুন / Please sign in to apply a coupon"
            });
        }

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "কুপন কোড আবশ্যক / Coupon code is required"
            });
        }

        // Fetch user's cart from DB to prevent client-side tampering (Bug 6)
        const cart = await CartModel.findOne({ userId }).populate("products.productId");

        if (!cart || cart.products.length === 0) {
            return res.status(400).json({
                success: false,
                message: "আপনার কার্ট খালি / Your cart is empty"
            });
        }

        const cartItems = cart.products
            .filter((item: any) => item.productId && "_id" in item.productId)
            .map((item: any) => ({
                productId: item.productId._id.toString(),
                quantity: Number(item.quantity) || 0,
                price: Number(item.productId.price) || 0,
            }));

        if (cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: "কার্টে কোনো বৈধ পণ্য নেই / No valid products in cart"
            });
        }

        // Validate and calculate discount using service
        const { discountAmount, coupon } = await validateAndCalculateDiscount({
            code,
            cartItems,
            userId,
        });

        res.status(200).json({
            success: true,
            message: "কুপন সফলভাবে প্রযোজ্য হয়েছে / Coupon applied successfully",
            discountAmount: discountAmount,
            coupon: {
                code: coupon.code,
                discountType: coupon.discountType,
                discountAmount: coupon.discountAmount,
                applicableProduct: coupon.applicableProduct,
                applicableSubCategory: coupon.applicableSubCategory,
                applicableCategory: coupon.applicableCategory,
            }
        });

    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Apply coupon for Dropshipping checkout — accepts cartItems from request body
// (DS cart lives in Redux/localStorage, NOT in CartModel, so we can't read DB cart)
export const applyDropshippingCoupon = async (req: AuthRequest, res: Response) => {
    try {
        const { code, cartItems } = req.body;
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "কুপন ব্যবহার করার জন্য অনুগ্রহ করে সাইন ইন করুন / Please sign in to apply a coupon"
            });
        }

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "কুপন কোড আবশ্যক / Coupon code is required"
            });
        }

        if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: "কার্টে কোনো পণ্য নেই / No items in cart"
            });
        }

        // Validate each item has a valid productId
        const validItems = cartItems.filter((item: any) =>
            item.productId &&
            typeof item.productId === "string" &&
            mongoose.Types.ObjectId.isValid(item.productId) &&
            Number(item.quantity) > 0
        );

        if (validItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: "কার্টে কোনো বৈধ পণ্য নেই / No valid products in cart"
            });
        }

        // Fetch real prices from DB to prevent client-side price tampering
        const productIds = validItems.map((i: any) => new mongoose.Types.ObjectId(i.productId));
        const dbProducts = await productModel.find({ _id: { $in: productIds } }).select("price").lean();
        const priceMap = new Map<string, number>(dbProducts.map((p: any) => [p._id.toString(), Number(p.price) || 0]));

        const safeCartItems = validItems.map((item: any) => ({
            productId: item.productId,
            quantity: Number(item.quantity) || 1,
            price: priceMap.get(item.productId) ?? (Number(item.price) || 0),
        }));

        const { discountAmount, coupon } = await validateAndCalculateDiscount({
            code,
            cartItems: safeCartItems,
            userId,
        });

        res.status(200).json({
            success: true,
            message: "কুপন সফলভাবে প্রযোজ্য হয়েছে / Coupon applied successfully",
            discountAmount,
            coupon: {
                code: coupon.code,
                discountType: coupon.discountType,
                discountAmount: coupon.discountAmount,
                applicableProduct: coupon.applicableProduct,
                applicableSubCategory: coupon.applicableSubCategory,
                applicableCategory: coupon.applicableCategory,
            }
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Public: Get coupons applicable to a product (for dropshipping product detail page)
export const getProductCoupons = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;

        if (!productId) {
            return res.status(400).json({ success: false, message: "productId is required" });
        }

        // Fetch the product to get its category and subCategory
        const product = await productModel.findById(productId).select("category subCategory").lean();
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const now = new Date();
        const categoryIds = (product.category || []).map((c: any) => c._id || c);
        const subCategoryIds = (product.subCategory || []).map((s: any) => s._id || s);
        const productSubCatSet = new Set(subCategoryIds.map((s: any) => s.toString()));

        // Build a map of categoryId → subcategory IDs (subcategories that belong
        // to each of the product's categories). A category-level coupon only
        // matches if the product has a subcategory whose parent category is the
        // coupon's category.
        const subCategoriesByCategory = new Map<string, string[]>();
        if (categoryIds.length > 0) {
            const SubCategoryModel = (await import("../subcategory/subcategory.model")).default;
            const subDocs = await SubCategoryModel.find({ category: { $in: categoryIds } })
                .select("_id category")
                .lean();
            for (const sub of subDocs as any[]) {
                const catId = (sub.category?._id || sub.category).toString();
                if (!subCategoriesByCategory.has(catId)) {
                    subCategoriesByCategory.set(catId, []);
                }
                subCategoriesByCategory.get(catId)!.push(sub._id.toString());
            }
        }

        // Find active, non-expired coupons that are:
        // 1. Applicable to this specific product, OR
        // 2. Applicable to a subcategory the product has, OR
        // 3. Applicable to a category the product belongs to (category-only
        //    coupon — filtered further below to require a subcategory match), OR
        // 4. Global (no specific applicability filter)
        // Uses $in: [null, undefined] to make it less strict and handle missing fields (Bug 16)
        const coupons = await CouponModel.find({
            isActive: true,
            validFrom: { $lte: now },
            validUntil: { $gte: now },
            $or: [
                { applicableProduct: productId },
                {
                    applicableProduct: { $in: [null, undefined] },
                    applicableSubCategory: { $in: subCategoryIds }
                },
                {
                    applicableProduct: { $in: [null, undefined] },
                    applicableCategory: { $in: categoryIds },
                    applicableSubCategory: { $in: [null, undefined] }
                },
                {
                    applicableProduct: { $in: [null, undefined] },
                    applicableCategory: { $in: [null, undefined] },
                    applicableSubCategory: { $in: [null, undefined] }
                },
            ],
        })
        .select("code description discountType discountAmount maxDiscountAmount minOrderAmount validUntil usageLimit usedCount isActive")
        .sort({ createdAt: -1 })
        .lean();

        // Filter category-only coupons: only keep if product has a subcategory
        // whose parent category is the coupon's category.
        const validCoupons = coupons.filter((c: any) => {
            if (!c.applicableCategory) return true;
            if (c.applicableSubCategory) return true;
            const couponCatId = c.applicableCategory.toString();
            const categorySubCats = subCategoriesByCategory.get(couponCatId) || [];
            return categorySubCats.some(subId => productSubCatSet.has(subId));
        });

        res.status(200).json({ success: true, data: validCoupons });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Create Coupon
export const createCoupon = async (req: AuthRequest, res: Response) => {
    try {
        const data = req.body;
        const exists = await CouponModel.findOne({ code: data.code?.toUpperCase() });

        if (exists) {
            return res.status(400).json({
                success: false,
                message: "কুপন কোডটি ইতিমধ্যে তৈরি করা হয়েছে / Coupon code already exists"
            });
        }

        const coupon = new CouponModel({
            ...data,
            code: data.code?.toUpperCase()
        });

        await coupon.save();

        res.status(201).json({ success: true, message: "Coupon created successfully", data: coupon });
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "কুপন কোডটি ইতিমধ্যে তৈরি করা হয়েছে / Coupon code already exists"
            });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Get all coupons
// By default, soft-deleted (inactive) coupons are excluded so the admin list
// matches what the user-facing APIs return. Pass `includeInactive=true` to
// see coupons that were deactivated/deleted.
export const getCoupons = async (req: AuthRequest, res: Response) => {
    try {
        const { isActive, isExpired, includeInactive } = req.query;
        const filter: any = {};

        if (isActive !== undefined) {
            filter.isActive = isActive === "true";
        } else if (includeInactive !== "true") {
            // Default: hide inactive (soft-deleted) coupons
            filter.isActive = true;
        }

        if (isExpired !== undefined) {
            const now = new Date();
            if (isExpired === "true") {
                filter.validUntil = { $lt: now };
            } else {
                filter.validUntil = { $gte: now };
            }
        }

        const coupons = await CouponModel.find(filter).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: coupons });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Delete Coupon
// Always perform a hard delete. Orders only persist `couponDiscount: Number`
// (not a reference to the coupon document), so removing the coupon does not
// break order history. The previous soft-delete behaviour caused the
// "deleted" coupon to keep appearing in the admin list and to be
// re-fetched on the frontend.
export const deleteCoupon = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const coupon = await CouponModel.findByIdAndDelete(id);
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "কুপনটি পাওয়া যায়নি / Coupon not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "কুপনটি সফলভাবে মুছে ফেলা হয়েছে / Coupon deleted successfully"
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Update Coupon
export const updateCoupon = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const data = { ...req.body };

        // Strip read-only fields (Bug 29)
        delete data._id;
        delete data.usedCount;
        delete data.createdAt;
        delete data.updatedAt;

        const coupon = await CouponModel.findById(id);
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "কুপনটি পাওয়া যায়নি / Coupon not found"
            });
        }

        // Protect used coupon code and discountType (Bugs 11, 27)
        if (coupon.usedCount > 0) {
            if (data.code && data.code.toUpperCase() !== coupon.code) {
                return res.status(400).json({
                    success: false,
                    message: "ব্যবহৃত কুপনের কোড পরিবর্তন করা যাবে না / Cannot change the code of a coupon that has already been used"
                });
            }
            if (data.discountType && data.discountType !== coupon.discountType) {
                return res.status(400).json({
                    success: false,
                    message: "ব্যবহৃত কুপনের ডিসকাউন্ট ধরন পরিবর্তন করা যাবে না / Cannot change the discount type of a coupon that has already been used"
                });
            }
        }

        if (data.code) {
            data.code = data.code.toUpperCase();
            if (data.code !== coupon.code) {
                const exists = await CouponModel.findOne({ code: data.code });
                if (exists) {
                    return res.status(400).json({
                        success: false,
                        message: "কুপন কোডটি ইতিমধ্যে তৈরি করা হয়েছে / Coupon code already exists"
                    });
                }
            }
        }

        Object.assign(coupon, data);
        await coupon.save();

        res.status(200).json({
            success: true,
            message: "কুপন সফলভাবে আপডেট করা হয়েছে / Coupon updated successfully",
            data: coupon
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
