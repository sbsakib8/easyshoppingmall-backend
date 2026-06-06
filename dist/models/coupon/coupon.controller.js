"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCoupon = exports.deleteCoupon = exports.getCoupons = exports.createCoupon = exports.getProductCoupons = exports.applyDropshippingCoupon = exports.applyCoupon = void 0;
const coupon_model_1 = __importDefault(require("./coupon.model"));
const product_model_1 = __importDefault(require("../product/product.model"));
const cart_model_1 = require("../cart/cart.model");
const coupon_service_1 = require("./coupon.service");
const mongoose_1 = __importDefault(require("mongoose"));
// Apply coupon to calculate discount
const applyCoupon = async (req, res) => {
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
        const cart = await cart_model_1.CartModel.findOne({ userId }).populate("products.productId");
        if (!cart || cart.products.length === 0) {
            return res.status(400).json({
                success: false,
                message: "আপনার কার্ট খালি / Your cart is empty"
            });
        }
        const cartItems = cart.products
            .filter((item) => item.productId && "_id" in item.productId)
            .map((item) => ({
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
        const { discountAmount, coupon } = await (0, coupon_service_1.validateAndCalculateDiscount)({
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
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.applyCoupon = applyCoupon;
// Apply coupon for Dropshipping checkout — accepts cartItems from request body
// (DS cart lives in Redux/localStorage, NOT in CartModel, so we can't read DB cart)
const applyDropshippingCoupon = async (req, res) => {
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
        const validItems = cartItems.filter((item) => item.productId &&
            typeof item.productId === "string" &&
            mongoose_1.default.Types.ObjectId.isValid(item.productId) &&
            Number(item.quantity) > 0);
        if (validItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: "কার্টে কোনো বৈধ পণ্য নেই / No valid products in cart"
            });
        }
        // Fetch real prices from DB to prevent client-side price tampering
        const productIds = validItems.map((i) => new mongoose_1.default.Types.ObjectId(i.productId));
        const dbProducts = await product_model_1.default.find({ _id: { $in: productIds } }).select("price").lean();
        const priceMap = new Map(dbProducts.map((p) => [p._id.toString(), Number(p.price) || 0]));
        const safeCartItems = validItems.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity) || 1,
            price: priceMap.get(item.productId) ?? (Number(item.price) || 0),
        }));
        const { discountAmount, coupon } = await (0, coupon_service_1.validateAndCalculateDiscount)({
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
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.applyDropshippingCoupon = applyDropshippingCoupon;
// Public: Get coupons applicable to a product (for dropshipping product detail page)
const getProductCoupons = async (req, res) => {
    try {
        const { productId } = req.params;
        if (!productId) {
            return res.status(400).json({ success: false, message: "productId is required" });
        }
        // Fetch the product to get its category and subCategory
        const product = await product_model_1.default.findById(productId).select("category subCategory").lean();
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        const now = new Date();
        const categoryIds = (product.category || []).map((c) => c._id || c);
        const subCategoryIds = (product.subCategory || []).map((s) => s._id || s);
        const productSubCatSet = new Set(subCategoryIds.map((s) => s.toString()));
        // Build a map of categoryId → subcategory IDs (subcategories that belong
        // to each of the product's categories). A category-level coupon only
        // matches if the product has a subcategory whose parent category is the
        // coupon's category.
        const subCategoriesByCategory = new Map();
        if (categoryIds.length > 0) {
            const SubCategoryModel = (await Promise.resolve().then(() => __importStar(require("../subcategory/subcategory.model")))).default;
            const subDocs = await SubCategoryModel.find({ category: { $in: categoryIds } })
                .select("_id category")
                .lean();
            for (const sub of subDocs) {
                const catId = (sub.category?._id || sub.category).toString();
                if (!subCategoriesByCategory.has(catId)) {
                    subCategoriesByCategory.set(catId, []);
                }
                subCategoriesByCategory.get(catId).push(sub._id.toString());
            }
        }
        // Find active, non-expired coupons that are:
        // 1. Applicable to this specific product, OR
        // 2. Applicable to a subcategory the product has, OR
        // 3. Applicable to a category the product belongs to (category-only
        //    coupon — filtered further below to require a subcategory match), OR
        // 4. Global (no specific applicability filter)
        // Uses $in: [null, undefined] to make it less strict and handle missing fields (Bug 16)
        const coupons = await coupon_model_1.default.find({
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
        const validCoupons = coupons.filter((c) => {
            if (!c.applicableCategory)
                return true;
            if (c.applicableSubCategory)
                return true;
            const couponCatId = c.applicableCategory.toString();
            const categorySubCats = subCategoriesByCategory.get(couponCatId) || [];
            return categorySubCats.some(subId => productSubCatSet.has(subId));
        });
        res.status(200).json({ success: true, data: validCoupons });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getProductCoupons = getProductCoupons;
// Admin: Create Coupon
const createCoupon = async (req, res) => {
    try {
        const data = req.body;
        const exists = await coupon_model_1.default.findOne({ code: data.code?.toUpperCase() });
        if (exists) {
            return res.status(400).json({
                success: false,
                message: "কুপন কোডটি ইতিমধ্যে তৈরি করা হয়েছে / Coupon code already exists"
            });
        }
        const coupon = new coupon_model_1.default({
            ...data,
            code: data.code?.toUpperCase()
        });
        await coupon.save();
        res.status(201).json({ success: true, message: "Coupon created successfully", data: coupon });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "কুপন কোডটি ইতিমধ্যে তৈরি করা হয়েছে / Coupon code already exists"
            });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createCoupon = createCoupon;
// Admin: Get all coupons
// By default, soft-deleted (inactive) coupons are excluded so the admin list
// matches what the user-facing APIs return. Pass `includeInactive=true` to
// see coupons that were deactivated/deleted.
const getCoupons = async (req, res) => {
    try {
        const { isActive, isExpired, includeInactive } = req.query;
        const filter = {};
        if (isActive !== undefined) {
            filter.isActive = isActive === "true";
        }
        else if (includeInactive !== "true") {
            // Default: hide inactive (soft-deleted) coupons
            filter.isActive = true;
        }
        if (isExpired !== undefined) {
            const now = new Date();
            if (isExpired === "true") {
                filter.validUntil = { $lt: now };
            }
            else {
                filter.validUntil = { $gte: now };
            }
        }
        const coupons = await coupon_model_1.default.find(filter).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: coupons });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCoupons = getCoupons;
// Admin: Delete Coupon
// Always perform a hard delete. Orders only persist `couponDiscount: Number`
// (not a reference to the coupon document), so removing the coupon does not
// break order history. The previous soft-delete behaviour caused the
// "deleted" coupon to keep appearing in the admin list and to be
// re-fetched on the frontend.
const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await coupon_model_1.default.findByIdAndDelete(id);
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
        const data = { ...req.body };
        // Strip read-only fields (Bug 29)
        delete data._id;
        delete data.usedCount;
        delete data.createdAt;
        delete data.updatedAt;
        const coupon = await coupon_model_1.default.findById(id);
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
                const exists = await coupon_model_1.default.findOne({ code: data.code });
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateCoupon = updateCoupon;
