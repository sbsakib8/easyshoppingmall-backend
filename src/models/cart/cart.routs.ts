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
router.post("/add", addToCart);
router.get("/:userId",isAuth, getCart);
router.put("/update", updateCartItem);
router.delete("/remove/:userId/:productId", removeFromCart);
router.delete("/clear/:userId", clearCart);

export default router;
