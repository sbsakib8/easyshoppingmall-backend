"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearUserCart = void 0;
const cart_model_1 = require("../models/cart/cart.model");
const clearUserCart = async (userId) => {
    const cart = await cart_model_1.CartModel.findOne({ userId: userId });
    if (cart) {
        cart.products = [];
        cart.subTotalAmt = 0;
        cart.totalAmt = 0;
        await cart.save();
        return true;
    }
    return false;
};
exports.clearUserCart = clearUserCart;
