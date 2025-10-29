import express from "express";
import { isAdmin } from "../../middlewares/isAdmin";
import { isAuth } from "../../middlewares/isAuth";
import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
} from "../cart/cartController";
const router = express.Router();

// 🛒 Cart
router.post("/add", isAuth, addToCart);
router.get("/cart", isAuth, getCart);
router.delete("/:id", isAuth, removeFromCart);
router.delete("/cart", isAuth, clearCart);

export default router;
