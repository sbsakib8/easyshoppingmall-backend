import { Response } from "express";
import { WishlistModel } from "./wishlist.model";
import { IWishlist } from "./interface";
import { AuthRequest } from "../../middlewares/isAuth";

/**
 * @desc Add product to wishlist
 * @route POST /api/wishlist/add
 * @access Private (User)
 */
export const addToWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { productId } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ success: false, message: "Missing user or product ID" });
    }

    let wishlist = await WishlistModel.findOne({ userId });

    if (!wishlist) {
      wishlist = new WishlistModel({ userId, products: [{ productId }] });
    } else {
      const exists = wishlist.products.some(
        (p) => p.productId.toString() === String(productId)
      );
      if (!exists) wishlist.products.push({ productId });
    }

    await wishlist.save();

    res.status(200).json({
      success: true,
      message: "Product added to wishlist",
      data: wishlist,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Get user wishlist
 * @route GET /api/wishlist
 * @access Private (User)
 */
export const getWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const wishlist = await WishlistModel.findOne({ userId }).populate("products.productId");

    res.status(200).json({
      success: true,
      data: wishlist?.products || [],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Remove product from wishlist
 * @route DELETE /api/wishlist/remove/:productId
 * @access Private (User)
 */
export const removeFromWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { productId } = req.params as { productId: string };

    if (!userId || !productId) {
      return res.status(400).json({ success: false, message: "Missing user or product ID" });
    }

    const wishlist = await WishlistModel.findOne({ userId });
    if (!wishlist) return res.status(404).json({ success: false, message: "Wishlist not found" });

    wishlist.products = wishlist.products.filter((p) => p.productId.toString() !== String(productId));

    await wishlist.save();

    res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
      data: wishlist,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Clear entire wishlist
 * @route DELETE /api/wishlist/clear
 * @access Private (User)
 */
export const clearWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    await WishlistModel.findOneAndDelete({ userId });

    res.status(200).json({ success: true, message: "Wishlist cleared" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
