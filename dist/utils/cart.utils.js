"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearUserCart = void 0;
const cart_model_1 = require("../models/cart/cart.model");
const clearUserCart = async (userId) => {
    await cart_model_1.CartModel.findOneAndUpdate({ userId }, { $set: { products: [] } }, { new: true });
};
exports.clearUserCart = clearUserCart;
