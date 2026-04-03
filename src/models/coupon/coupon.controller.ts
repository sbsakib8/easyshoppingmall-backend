import { Response } from "express";
import { AuthRequest } from "../../middlewares/isAuth";
import CouponModel from "./coupon.model";

// Apply coupon to calculate discount
export const applyCoupon = async (req: AuthRequest, res: Response) => {
    try {
        const { code, checkoutAmount, cartItems } = req.body;

        if (!code || !checkoutAmount) {
            return res.status(400).json({ success: false, message: "Coupon code and checkout amount are required" });
        }

        const coupon = await CouponModel.findOne({ code: code.toUpperCase(), isActive: true });

        if (!coupon) {
            return res.status(404).json({ success: false, message: "Invalid or inactive coupon" });
        }

        // Check expiry
        const now = new Date();
        if (now < coupon.validFrom || now > coupon.validUntil) {
            return res.status(400).json({ success: false, message: "Coupon is expired or not valid yet" });
        }

        // Check usage limits
        if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
        }

        // Check min order amount (global check)
        if (checkoutAmount < coupon.minOrderAmount) {
            return res.status(400).json({
                success: false,
                message: `This coupon requires a minimum order of ৳${coupon.minOrderAmount}`
            });
        }

        let discountAmount = 0;
        let applicableAmount = 0;
        let isCouponValidForCart = false;

        if (coupon.applicableProduct || coupon.applicableSubCategory || coupon.applicableCategory) {
            if (!cartItems || !Array.isArray(cartItems)) {
                return res.status(400).json({ success: false, message: "Cart items are required for targeted coupons" });
            }

            cartItems.forEach((item: any) => {
                const productId = item.productId?._id || item.productId || item.id;
                const productCategories = item.productId?.category || item.category || [];
                const productSubCategories = item.productId?.subCategory || item.subCategory || [];

                let matches = false;

                if (coupon.applicableProduct && productId === coupon.applicableProduct.toString()) {
                    matches = true;
                } else if (coupon.applicableSubCategory && productSubCategories.some((scId: any) => (scId._id || scId).toString() === coupon.applicableSubCategory?.toString())) {
                    matches = true;
                } else if (coupon.applicableCategory && productCategories.some((cId: any) => (cId._id || cId).toString() === coupon.applicableCategory?.toString())) {
                    matches = true;
                }

                if (matches) {
                    applicableAmount += item.price * item.quantity;
                    isCouponValidForCart = true;
                }
            });

            if (!isCouponValidForCart) {
                return res.status(400).json({ success: false, message: "This coupon is not applicable to any items in your cart" });
            }
        } else {
            applicableAmount = checkoutAmount;
            isCouponValidForCart = true;
        }

        // Calculate discount
        if (coupon.discountType === "flat") {
            discountAmount = coupon.discountAmount;
        } else if (coupon.discountType === "percentage") {
            discountAmount = applicableAmount * (coupon.discountAmount / 100);
            if (coupon.maxDiscountAmount > 0 && discountAmount > coupon.maxDiscountAmount) {
                discountAmount = coupon.maxDiscountAmount;
            }
        }

        // Prevent discount > applicableAmount (especially for flat discounts)
        if (discountAmount > applicableAmount) discountAmount = applicableAmount;

        res.status(200).json({
            success: true,
            message: "Coupon applied successfully",
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
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Create Coupon
export const createCoupon = async (req: AuthRequest, res: Response) => {
    try {
        const data = req.body;
        const exists = await CouponModel.findOne({ code: data.code?.toUpperCase() });

        if (exists) {
            return res.status(400).json({ success: false, message: "Coupon code already exists" });
        }

        const coupon = new CouponModel({
            ...data,
            code: data.code?.toUpperCase()
        });

        await coupon.save();

        res.status(201).json({ success: true, message: "Coupon created successfully", data: coupon });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Get all coupons
export const getCoupons = async (req: AuthRequest, res: Response) => {
    try {
        const coupons = await CouponModel.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: coupons });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Delete Coupon
export const deleteCoupon = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await CouponModel.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Coupon deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Update Coupon
export const updateCoupon = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;

        if (data.code) {
            data.code = data.code.toUpperCase();
        }

        const coupon = await CouponModel.findByIdAndUpdate(id, data, { new: true });

        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        res.status(200).json({ success: true, message: "Coupon updated successfully", data: coupon });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
