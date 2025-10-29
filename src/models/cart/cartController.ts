import { Request, Response } from "express";
import mongoose from "mongoose";
import { CartModel } from "./cardproduct.model";
import { ICart } from "./interface";
import { AuthUser } from "../order/interface";

/**
 * Extending Express Request to include user
 */
interface RequestWithUser extends Request {
    user?: AuthUser;
}

/**
 * @desc Add product to cart
 * @route POST /api/cart/add
 * @access Private (User)
 */
export const addToCart = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const userId = req.params?._id;
        const { productId, quantity, price } = req.body;

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized user" });
            return;
        }

        if (!productId || !quantity || !price) {
            res.status(400).json({ success: false, message: "Missing required fields" });
            return;
        }

        let cart = await CartModel.findOne({ userId });

        if (!cart) {
            // Create new cart
            cart = new CartModel({
                userId,
                products: [
                    {
                        productId,
                        quantity,
                        price,
                        totalPrice: quantity * price,
                    },
                ],
            });
        } else {
            // Check if product already in cart
            const existingProduct = cart.products.find(
                (item) => item.productId.toString() === productId
            );

            if (existingProduct) {
                existingProduct.quantity += quantity;
                existingProduct.totalPrice = existingProduct.quantity * existingProduct.price;
            } else {
                cart.products.push({
                    productId,
                    quantity,
                    price,
                    totalPrice: quantity * price,
                });
            }
        }

        await cart.save();

        res.status(200).json({
            success: true,
            message: "Product added to cart successfully",
            data: cart,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

/**
 * @desc Get user's cart
 * @route GET /api/cart
 * @access Private (User)
 */
export const getCart = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized user" });
            return;
        }

        const cart = await CartModel.findOne({ userId }).populate("products.productId");

        if (!cart) {
            res.status(404).json({ success: false, message: "Cart not found" });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Cart fetched successfully",
            data: cart,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

/**
 * @desc Update cart item quantity
 * @route PUT /api/cart/update/:productId
 * @access Private (User)
 */
export const updateCartItem = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;
        const { productId } = req.params;
        const { quantity } = req.body;

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized user" });
            return;
        }

        if (!quantity || quantity < 1) {
            res.status(400).json({ success: false, message: "Quantity must be at least 1" });
            return;
        }

        const cart = await CartModel.findOne({ userId });
        if (!cart) {
            res.status(404).json({ success: false, message: "Cart not found" });
            return;
        }

        const product = cart.products.find(
            (item) => item.productId.toString() === productId
        );

        if (!product) {
            res.status(404).json({ success: false, message: "Product not found in cart" });
            return;
        }

        product.quantity = quantity;
        product.totalPrice = quantity * product.price;

        await cart.save();

        res.status(200).json({
            success: true,
            message: "Cart updated successfully",
            data: cart,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

/**
 * @desc Remove product from cart
 * @route DELETE /api/cart/remove/:productId
 * @access Private (User)
 */
export const removeFromCart = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;
        const { productId } = req.params;

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized user" });
            return;
        }

        const cart = await CartModel.findOne({ userId });
        if (!cart) {
            res.status(404).json({ success: false, message: "Cart not found" });
            return;
        }

        cart.products = cart.products.filter(
            (item) => item.productId.toString() !== productId
        );

        await cart.save();

        res.status(200).json({
            success: true,
            message: "Product removed from cart successfully",
            data: cart,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

/**
 * @desc Clear user cart
 * @route DELETE /api/cart/clear
 * @access Private (User)
 */
export const clearCart = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized user" });
            return;
        }

        await CartModel.deleteMany({ userId });

        res.status(200).json({
            success: true,
            message: "Cart cleared successfully",
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};
