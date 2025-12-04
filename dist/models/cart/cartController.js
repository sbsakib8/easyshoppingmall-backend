"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCart = exports.removeFromCart = exports.updateCartItem = exports.getCart = exports.addToCart = void 0;
const cardproduct_model_1 = require("./cardproduct.model");
/**
 * @desc Add product to cart
 * @route POST /api/cart/add
 * @access Private (User)
 */
const addToCart = async (req, res) => {
    try {
        const { userId, productId, quantity, price, selectedColor, selectedSize, selectedWeight } = req.body;
        if (!userId || !productId || !quantity || !price) {
            res.status(400).json({ success: false, message: "Missing required fields" });
            return;
        }
        let cart = await cardproduct_model_1.CartModel.findOne({ userId });
        if (!cart) {
            cart = new cardproduct_model_1.CartModel({
                userId,
                products: [
                    {
                        productId,
                        quantity,
                        price,
                        totalPrice: quantity * price,
                        selectedColor,
                        selectedSize,
                        selectedWeight
                    },
                ],
            });
        }
        else {
            const existingProduct = cart.products.find((item) => item.productId.toString() === productId &&
                item.selectedColor === selectedColor &&
                item.selectedSize === selectedSize &&
                item.selectedWeight === selectedWeight);
            if (existingProduct) {
                existingProduct.quantity += quantity;
                existingProduct.totalPrice = existingProduct.quantity * existingProduct.price;
            }
            else {
                cart.products.push({
                    productId,
                    quantity,
                    price,
                    totalPrice: quantity * price,
                    selectedColor,
                    selectedSize,
                    selectedWeight
                });
            }
        }
        await cart.save();
        res.status(200).json({
            success: true,
            message: "Product added to cart successfully",
            data: cart,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
exports.addToCart = addToCart;
/**
 * @desc Get user's cart
 * @route GET /api/cart
 * @access Private (User)
 */
const getCart = async (req, res) => {
    try {
        const userId = req.params?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized user" });
            return;
        }
        const cart = await cardproduct_model_1.CartModel.findOne({ userId }).populate("products.productId");
        if (!cart) {
            res.status(404).json({ success: false, message: "Cart not found" });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Cart fetched successfully",
            data: cart,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};
exports.getCart = getCart;
/**
 * @desc Update cart item quantity
 * @route PUT /api/cart/update/:productId
 * @access Private (User)
 */
const updateCartItem = async (req, res) => {
    try {
        const { userId, productId, quantity } = req.body;
        if (!userId || !productId || !quantity) {
            res.status(400).json({ success: false, message: "Missing required fields" });
            return;
        }
        const cart = await cardproduct_model_1.CartModel.findOne({ userId });
        if (!cart) {
            res.status(404).json({ success: false, message: "Cart not found" });
            return;
        }
        const product = cart.products.find((item) => item.productId.toString() === productId);
        if (!product) {
            res.status(404).json({ success: false, message: "Product not found in cart" });
            return;
        }
        product.quantity = quantity;
        product.totalPrice = product.quantity * product.price;
        // Recalculate totals
        cart.subTotalAmt = cart.products.reduce((acc, item) => acc + item.totalPrice, 0);
        cart.totalAmt = cart.subTotalAmt;
        await cart.save();
        res.status(200).json({
            success: true,
            message: "Cart item updated successfully",
            data: cart,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};
exports.updateCartItem = updateCartItem;
/**
 * @desc Remove product from cart
 * @route DELETE /api/cart/remove/:productId
 * @access Private (User)
 */
const removeFromCart = async (req, res) => {
    try {
        const { userId, productId } = req.params;
        const cart = await cardproduct_model_1.CartModel.findOne({ userId });
        if (!cart) {
            res.status(404).json({ success: false, message: "Cart not found" });
            return;
        }
        cart.products = cart.products.filter((item) => item.productId.toString() !== productId);
        // Update totals
        cart.subTotalAmt = cart.products.reduce((acc, item) => acc + item.totalPrice, 0);
        cart.totalAmt = cart.subTotalAmt;
        await cart.save();
        res.status(200).json({
            success: true,
            message: "Product removed from cart successfully",
            data: cart,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};
exports.removeFromCart = removeFromCart;
/**
 * @desc Clear user cart
 * @route DELETE /api/cart/clear
 * @access Private (User)
 */
const clearCart = async (req, res) => {
    try {
        const { userId } = req.params;
        const cart = await cardproduct_model_1.CartModel.findOne({ userId });
        if (!cart) {
            res.status(404).json({ success: false, message: "Cart not found" });
            return;
        }
        cart.products = [];
        cart.subTotalAmt = 0;
        cart.totalAmt = 0;
        await cart.save();
        res.status(200).json({
            success: true,
            message: "Cart cleared successfully",
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};
exports.clearCart = clearCart;
