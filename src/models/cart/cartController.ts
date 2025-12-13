import { Request, Response } from "express";
import { AuthUser } from "../order/interface";
import { CartModel } from "./cardproduct.model";

/**
 * Extending Express Request to include user
 */
interface RequestWithUser extends Request {
  user?: AuthUser;
}

/**
 * Helper to check if two cart items are the same variant
 */
const isSameVariant = (item: any, productId: string, color: string | null, size: string | null, weight: string | null) => {
  return (
    item.productId.toString() === productId &&
    (item.color ?? null) === color &&
    (item.size ?? null) === size &&
    (item.weight ?? null) === weight
  );
};

/**
 * @desc Add product to cart
 * @route POST /api/cart/add
 * @access Private (User)
 */
export const addToCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, productId, quantity, price, color = null, size = null, weight = null } = req.body;

    if (!userId || !productId || !quantity || !price) {
      res.status(400).json({ success: false, message: "Missing required fields" });
      return;
    }

    let cart = await CartModel.findOne({ userId });

    if (!cart) {
      cart = new CartModel({
        userId,
        products: [{ productId, quantity, price, color, size, weight, totalPrice: quantity * price }],
      });
    } else {
      const existingProduct = cart.products.find(item => isSameVariant(item, productId, color, size, weight));

      if (existingProduct) {
        existingProduct.quantity += quantity;
        existingProduct.totalPrice = existingProduct.quantity * existingProduct.price;
      } else {
        cart.products.push({ productId, quantity, price, color, size, weight, totalPrice: quantity * price });
      }
    }

    await cart.save();

    res.status(200).json({ success: true, message: "Product added to cart successfully", data: cart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

/**
 * @desc Get user's cart
 * @route GET /api/cart/:userId
 * @access Private (User)
 */
export const getCart = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    const userId = req.params?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized user" });
      return;
    }

    const cart = await CartModel.findOne({ userId }).populate("products.productId");

    if (!cart) {
      res.status(404).json({ success: false, message: "Cart not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Cart fetched successfully", data: cart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

/**
 * @desc Update cart item quantity
 * @route PUT /api/cart/update
 * @access Private (User)
 */
export const updateCartItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, productId, quantity, color = null, size = null, weight = null } = req.body;

    if (!userId || !productId || !quantity) {
      res.status(400).json({ success: false, message: "Missing required fields" });
      return;
    }

    const cart = await CartModel.findOne({ userId });
    if (!cart) {
      res.status(404).json({ success: false, message: "Cart not found" });
      return;
    }

    const product = cart.products.find(item => isSameVariant(item, productId, color, size, weight));
    if (!product) {
      res.status(404).json({ success: false, message: "Cart item not found" });
      return;
    }

    product.quantity = quantity;
    product.totalPrice = product.price * quantity;

    cart.subTotalAmt = cart.products.reduce((sum, p) => sum + p.totalPrice, 0);
    cart.totalAmt = cart.subTotalAmt;

    await cart.save();

    res.status(200).json({ success: true, message: "Cart item updated successfully", data: cart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

/**
 * @desc Remove product from cart
 * @route DELETE /api/cart/remove
 * @access Private (User)
 */
export const removeFromCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, productId, color = null, size = null, weight = null } = req.body;

    const cart = await CartModel.findOne({ userId });
    if (!cart) {
      res.status(404).json({ success: false, message: "Cart not found" });
      return;
    }

    const initialLength = cart.products.length;
    cart.products = cart.products.filter(item => !isSameVariant(item, productId, color, size, weight));

    if (cart.products.length === initialLength) {
      res.status(404).json({ success: false, message: "Cart item not found" });
      return;
    }

    cart.subTotalAmt = cart.products.reduce((sum, p) => sum + p.totalPrice, 0);
    cart.totalAmt = cart.subTotalAmt;

    await cart.save();

    res.status(200).json({ success: true, message: "Product removed from cart successfully", data: cart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

/**
 * @desc Clear user cart
 * @route DELETE /api/cart/clear/:userId
 * @access Private (User)
 */
export const clearCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const cart = await CartModel.findOne({ userId });
    if (!cart) {
      res.status(404).json({ success: false, message: "Cart not found" });
      return;
    }

    cart.products = [];
    cart.subTotalAmt = 0;
    cart.totalAmt = 0;

    await cart.save();

    res.status(200).json({ success: true, message: "Cart cleared successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};
