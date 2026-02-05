import { Request, Response } from "express";
import { AuthUser } from "../order/interface";
import ProductModel from "../product/product.model";
import UserModel from "../user/user.model";
import { CartModel } from "./cart.model";
import { ICartProduct } from "./interface";

/**
 * Extending Express Request to include user
 */
interface RequestWithUser extends Request {
  user?: AuthUser;
}

/**
 * Helper to check if two cart items are the same variant
 */
const isSameVariant = (
  item: ICartProduct,
  productId: string,
  color?: string | null,
  size?: string | null,
  weight?: string | null
) => {
  if (item.productId.toString() !== productId) return false;

  const itemColor = item.color ?? null;
  const itemSize = item.size ?? null;
  const itemWeight = item.weight ?? null;

  if (color && itemColor !== color) return false;
  if (size && itemSize !== size) return false;
  if (weight && itemWeight !== weight) return false;

  return true;
};


/**
 * @desc Add product to cart
 * @route POST /api/cart/add
 * @access Private (User)
 */
export const addToCart = async (req: Request, res: Response) => {
  try {
    let { productId, quantity, price, color, size, weight } = req.body;
    const userId = (req as any).userId;


    if (!userId || !productId || !quantity) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // 🔥 Fetch product
    const product = await ProductModel.findById(productId);
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

    let cart = await CartModel.findOne({ userId });

    if (!cart) {
      cart = new CartModel({
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
    } else {
      const existingProduct = cart.products.find((item: ICartProduct) =>
        isSameVariant(item, productId, color, size, weight)
      );

      if (existingProduct) {
        existingProduct.quantity += quantity;
        existingProduct.totalPrice = existingProduct.quantity * existingProduct.price;
      } else {
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

    cart.subTotalAmt = cart.products.reduce((s: number, p: ICartProduct) => s + p.totalPrice, 0);
    cart.totalAmt = cart.subTotalAmt;

    await cart.save();
    await UserModel.findByIdAndUpdate(userId, {
      $addToSet: { shopping_cart: cart._id },
    });

    res.json({
      success: true,
      message: "Product added to cart",
      data: cart,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};


/**
 * @desc Get user's cart
 * @route GET /api/cart/:userId
 * @access Private (User)
 */
export const getCart = async (req: RequestWithUser, res: Response): Promise<Response> => {
  try {
    const userId = req.params?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized user" });
    }

    // const cart = await CartModel.findOne({ userId }).populate("products.productId");
    const cart = await CartModel.findOne({ userId })
      .populate({
        path: "products.productId",
        populate: {
          path: "category",
          select: "name",
        },
      });


    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "Cart is empty",
        data: { userId, products: [], subTotalAmt: 0, totalAmt: 0 }
      });
    }

    return res.status(200).json({ success: true, message: "Cart fetched successfully", data: cart });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

/**
 * @desc Update cart item quantity
 * @route PUT /api/cart/update
 * @access Private (User)
 */
export const updateCartItem = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId, productId, quantity, color, size, weight } = req.body;

    if (!userId || !productId || quantity == null) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const cart = await CartModel.findOne({ userId });
    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "Cart is empty",
        data: { userId, products: [], subTotalAmt: 0, totalAmt: 0 }
      });
    }

    const product = cart.products.find((item: ICartProduct) =>
      isSameVariant(
        item,
        productId,
        color ?? undefined,
        size ?? undefined,
        weight ?? undefined
      )
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "Cart item not found" });
    }

    product.quantity = Number(quantity);
    product.totalPrice = product.price * product.quantity;

    cart.subTotalAmt = cart.products.reduce((sum: number, p: ICartProduct) => sum + p.totalPrice, 0);
    cart.totalAmt = cart.subTotalAmt;

    await cart.save();

    return res.status(200).json({ success: true, message: "Cart item updated successfully", data: cart });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};



/**
 * @desc Remove product from cart
 * @route DELETE /api/cart/remove
 * @access Private (User)
 */
export const removeFromCart = async (req: Request, res: Response) => {
  try {
    const { userId, productId } = req.params;
    const { color, size, weight } = req.query;

    const cart = await CartModel.findOne({ userId });
    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "Cart is empty",
        data: { userId, products: [], subTotalAmt: 0, totalAmt: 0 }
      });
    }

    cart.products = cart.products.filter((item: ICartProduct) =>
      !isSameVariant(
        item,
        productId,
        color ? String(color) : undefined,
        size ? String(size) : undefined,
        weight ? String(weight) : undefined
      )
    );

    if (cart.products.length === 0) {
      cart.subTotalAmt = 0;
      cart.totalAmt = 0;
      await cart.save();

      return res.json({
        success: true,
        message: "Cart is now empty",
        data: cart,
      });
    }
    else {
      cart.subTotalAmt = cart.products.reduce((s: number, p: ICartProduct) => s + p.totalPrice, 0);
      cart.totalAmt = cart.subTotalAmt;
      await cart.save();
    }



    res.json({ success: true, message: "Removed from cart", data: cart });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};


/**
 * @desc Clear user cart
 * @route DELETE /api/cart/clear/:userId
 * @access Private (User)
 */
export const clearCart = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId } = req.params;

    let cart = await CartModel.findOne({ userId });

    if (!cart) {
      cart = await CartModel.create({
        userId,
        products: [],
        subTotalAmt: 0,
        totalAmt: 0,
      });
    } else {
      cart.products = [];
      cart.subTotalAmt = 0;
      cart.totalAmt = 0;
      await cart.save();
    }

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      data: cart,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

