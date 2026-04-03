"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCoupon = exports.deleteCoupon = exports.getCoupons = exports.createCoupon = exports.applyCoupon = void 0;
const coupon_model_1 = __importDefault(require("./coupon.model"));
// Apply coupon to calculate discount
const applyCoupon = async (req, res) => {
    try {
        const { code, checkoutAmount, cartItems } = req.body;
        if (!code || !checkoutAmount) {
            return res.status(400).json({ success: false, message: "Coupon code and checkout amount are required" });
        }
        const coupon = await coupon_model_1.default.findOne({ code: code.toUpperCase(), isActive: true });
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
            cartItems.forEach((item) => {
                const productId = item.productId?._id || item.productId || item.id;
                const productCategories = item.productId?.category || item.category || [];
                const productSubCategories = item.productId?.subCategory || item.subCategory || [];
                let matches = false;
                if (coupon.applicableProduct && productId === coupon.applicableProduct.toString()) {
                    matches = true;
                }
                else if (coupon.applicableSubCategory && productSubCategories.some((scId) => (scId._id || scId).toString() === coupon.applicableSubCategory?.toString())) {
                    matches = true;
                }
                else if (coupon.applicableCategory && productCategories.some((cId) => (cId._id || cId).toString() === coupon.applicableCategory?.toString())) {
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
        }
        else {
            applicableAmount = checkoutAmount;
            isCouponValidForCart = true;
        }
        // Calculate discount
        if (coupon.discountType === "flat") {
            discountAmount = coupon.discountAmount;
        }
        else if (coupon.discountType === "percentage") {
            discountAmount = applicableAmount * (coupon.discountAmount / 100);
            if (coupon.maxDiscountAmount > 0 && discountAmount > coupon.maxDiscountAmount) {
                discountAmount = coupon.maxDiscountAmount;
            }
        }
        // Prevent discount > applicableAmount (especially for flat discounts)
        if (discountAmount > applicableAmount)
            discountAmount = applicableAmount;
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.applyCoupon = applyCoupon;
// Admin: Create Coupon
const createCoupon = async (req, res) => {
    try {
        const data = req.body;
        const exists = await coupon_model_1.default.findOne({ code: data.code?.toUpperCase() });
        if (exists) {
            return res.status(400).json({ success: false, message: "Coupon code already exists" });
        }
        const coupon = new coupon_model_1.default({
            ...data,
            code: data.code?.toUpperCase()
        });
        await coupon.save();
        res.status(201).json({ success: true, message: "Coupon created successfully", data: coupon });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createCoupon = createCoupon;
// Admin: Get all coupons
const getCoupons = async (req, res) => {
    try {
        const coupons = await coupon_model_1.default.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: coupons });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCoupons = getCoupons;
// Admin: Delete Coupon
const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        await coupon_model_1.default.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Coupon deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteCoupon = deleteCoupon;
// Admin: Update Coupon
const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        if (data.code) {
            data.code = data.code.toUpperCase();
        }
        const coupon = await coupon_model_1.default.findByIdAndUpdate(id, data, { new: true });
        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }
        res.status(200).json({ success: true, message: "Coupon updated successfully", data: coupon });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateCoupon = updateCoupon;
