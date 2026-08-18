import express from "express";
import {
  addToCart,
  getCart,
  removeFromCart,
  updateCartItem,
  clearCart
} from "../cart/cartController";
import { isAuth } from "../../middlewares/isAuth";
const router = express.Router();

// 🛒 Cart
router.post("/add", isAuth, addToCart);
router.get("/:userId", isAuth, getCart);
router.put("/update", isAuth, updateCartItem);
router.delete("/remove/:userId/:productId", isAuth, removeFromCart);
router.delete("/clear/:userId", isAuth, clearCart);

export default router;
