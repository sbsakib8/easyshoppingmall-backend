import express from "express";
import {
  addToCart,
  getCart,
  updateCartItem,
  clearCart,
  removeFromCart
} from "./cartController";
import { isAuth } from "../../middlewares/isAuth";

const router = express.Router();

router.post("/add", addToCart);
router.get("/:userId",isAuth, getCart);
router.put("/update", updateCartItem);
router.delete("/remove/:userId/:productId", removeFromCart);
router.delete("/clear/:userId", clearCart);

export default router;
