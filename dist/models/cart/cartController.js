"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCart = exports.removeFromCart = exports.updateCartItem = exports.getCart = exports.addToCart = void 0;
const product_model_1 = __importDefault(require("../product/product.model"));
const cardproduct_model_1 = require("./cardproduct.model");
/**
 * Helper to check if two cart items are the same variant
 */
const isSameVariant = (item, productId, color, size, weight) => {
    if (item.productId.toString() !== productId)
        return false;
    // Only match variant fields if they are provided
    if (color != null && (item.color ?? null) !== color)
        return false;
    if (size != null && (item.size ?? null) !== size)
        return false;
    if (weight != null && (item.weight ?? null) !== weight)
        return false;
    return true;
};
/**
 * @desc Add product to cart
 * @route POST /api/cart/add
 * @access Private (User)
 */
const addToCart = async (req, res) => {
    try {
        let { userId, productId, quantity, price, color, size, weight } = req.body;
        if (!userId || !productId || !quantity) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        // 🔥 Fetch product
        const product = await product_model_1.default.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        // 🔥 AUTO PICK FIRST VARIANT IF NOT SELECTED
        size =
            size ??
                (product.productSize?.length ? product.productSize[0] : null);
        color =
            color ??
                (product.color?.length ? product.color[0] : null);
        weight =
            weight ??
                (product.productWeight?.length ? product.productWeight[0] : null);
        // 🔥 Price fallback
        price = price ?? product.price;
        let cart = await cardproduct_model_1.CartModel.findOne({ userId });
        if (!cart) {
            cart = new cardproduct_model_1.CartModel({
                userId,
                products: [{
                        productId,
                        quantity,
                        price,
                        color,
                        size,
                        weight,
                        totalPrice: quantity * price,
                    }],
            });
        }
        else {
            const existingProduct = cart.products.find(item => isSameVariant(item, productId, color, size, weight));
            if (existingProduct) {
                existingProduct.quantity += quantity;
                existingProduct.totalPrice = existingProduct.quantity * existingProduct.price;
            }
            else {
                cart.products.push({
                    productId,
                    quantity,
                    price,
                    color,
                    size,
                    weight,
                    totalPrice: quantity * price,
                });
            }
        }
        cart.subTotalAmt = cart.products.reduce((s, p) => s + p.totalPrice, 0);
        cart.totalAmt = cart.subTotalAmt;
        await cart.save();
        res.json({
            success: true,
            message: "Product added to cart",
            data: cart,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.addToCart = addToCart;
/**
 * @desc Get user's cart
 * @route GET /api/cart/:userId
 * @access Private (User)
 */
const getCart = async (req, res) => {
    try {
        const userId = req.params?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized user" });
        }
        // const cart = await CartModel.findOne({ userId }).populate("products.productId");
        const cart = await cardproduct_model_1.CartModel.findOne({ userId })
            .populate({
            path: "products.productId",
            populate: {
                path: "category",
                select: "name",
            },
        });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }
        return res.status(200).json({ success: true, message: "Cart fetched successfully", data: cart });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};
exports.getCart = getCart;
/**
 * @desc Update cart item quantity
 * @route PUT /api/cart/update
 * @access Private (User)
 */
const updateCartItem = async (req, res) => {
    try {
        const { userId, productId, quantity, color, size, weight } = req.body;
        if (!userId || !productId || quantity == null) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        const cart = await cardproduct_model_1.CartModel.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }
        const product = cart.products.find(item => isSameVariant(item, productId, color ?? undefined, size ?? undefined, weight ?? undefined));
        if (!product) {
            return res.status(404).json({ success: false, message: "Cart item not found" });
        }
        product.quantity = Number(quantity);
        product.totalPrice = product.price * product.quantity;
        cart.subTotalAmt = cart.products.reduce((sum, p) => sum + p.totalPrice, 0);
        cart.totalAmt = cart.subTotalAmt;
        await cart.save();
        return res.status(200).json({ success: true, message: "Cart item updated successfully", data: cart });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};
exports.updateCartItem = updateCartItem;
/**
 * @desc Remove product from cart
 * @route DELETE /api/cart/remove
 * @access Private (User)
 */
const removeFromCart = async (req, res) => {
    try {
        const { userId, productId } = req.params;
        const { color, size, weight } = req.query;
        const cart = await cardproduct_model_1.CartModel.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }
        cart.products = cart.products.filter(item => !isSameVariant(item, productId, color ? String(color) : undefined, size ? String(size) : undefined, weight ? String(weight) : undefined));
        cart.subTotalAmt = cart.products.reduce((s, p) => s + p.totalPrice, 0);
        cart.totalAmt = cart.subTotalAmt;
        await cart.save();
        res.json({ success: true, message: "Removed from cart", data: cart });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.removeFromCart = removeFromCart;
/**
 * @desc Clear user cart
 * @route DELETE /api/cart/clear/:userId
 * @access Private (User)
 */
const clearCart = async (req, res) => {
    try {
        const { userId } = req.params;
        const cart = await cardproduct_model_1.CartModel.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }
        cart.products = [];
        cart.subTotalAmt = 0;
        cart.totalAmt = 0;
        await cart.save();
        return res.status(200).json({ success: true, message: "Cart cleared successfully" });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};
exports.clearCart = clearCart;
