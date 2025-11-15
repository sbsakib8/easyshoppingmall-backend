"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearWishlist = exports.removeFromWishlist = exports.getWishlist = exports.addToWishlist = void 0;
const wishlist_model_1 = require("./wishlist.model");
/**
 * @desc Add product to wishlist
 * @route POST /api/wishlist/add
 * @access Private (User)
 */
const addToWishlist = async (req, res) => {
    try {
        const userId = req.userId;
        const { productId } = req.body;
        if (!userId || !productId) {
            return res.status(400).json({ success: false, message: "Missing user or product ID" });
        }
        let wishlist = await wishlist_model_1.WishlistModel.findOne({ userId });
        if (!wishlist) {
            wishlist = new wishlist_model_1.WishlistModel({ userId, products: [{ productId }] });
        }
        else {
            const exists = wishlist.products.some((p) => p.productId.toString() === String(productId));
            if (!exists)
                wishlist.products.push({ productId });
        }
        await wishlist.save();
        res.status(200).json({
            success: true,
            message: "Product added to wishlist",
            data: wishlist,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.addToWishlist = addToWishlist;
/**
 * @desc Get user wishlist
 * @route GET /api/wishlist
 * @access Private (User)
 */
const getWishlist = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const wishlist = await wishlist_model_1.WishlistModel.findOne({ userId }).populate("products.productId");
        res.status(200).json({
            success: true,
            data: wishlist?.products || [],
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getWishlist = getWishlist;
/**
 * @desc Remove product from wishlist
 * @route DELETE /api/wishlist/remove/:productId
 * @access Private (User)
 */
const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.userId;
        const { productId } = req.params;
        if (!userId || !productId) {
            return res.status(400).json({ success: false, message: "Missing user or product ID" });
        }
        const wishlist = await wishlist_model_1.WishlistModel.findOne({ userId });
        if (!wishlist)
            return res.status(404).json({ success: false, message: "Wishlist not found" });
        wishlist.products = wishlist.products.filter((p) => p.productId.toString() !== String(productId));
        await wishlist.save();
        res.status(200).json({
            success: true,
            message: "Product removed from wishlist",
            data: wishlist,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.removeFromWishlist = removeFromWishlist;
/**
 * @desc Clear entire wishlist
 * @route DELETE /api/wishlist/clear
 * @access Private (User)
 */
const clearWishlist = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        await wishlist_model_1.WishlistModel.findOneAndDelete({ userId });
        res.status(200).json({ success: true, message: "Wishlist cleared" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.clearWishlist = clearWishlist;
