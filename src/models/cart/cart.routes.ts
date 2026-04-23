import express from "express";
import { isAdmin } from "../../middlewares/isAdmin";
import { isAuth } from "../../middlewares/isAuth";
import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
  updateCartItem,
} from "../cart/cartController";
const router = express.Router();

// 🛒 Cart
router.post("/add", isAuth, addToCart);
router.get("/:userId", isAuth, getCart);
router.put("/update", isAuth, updateCartItem);
router.delete("/remove/:userId/:productId", isAuth, removeFromCart);
router.delete("/clear/:userId", isAuth, clearCart);

export default router;
