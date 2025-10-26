import express from "express";
import { isAdmin } from "../../middlewares/isAdmin";
import { isAuth } from "../../middlewares/isAuth";
import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
} from "../cart/cartController";
import {
  createOrder,
  getMyOrders,
  updateOrderStatus,
} from "../order/order.controllers";

const router = express.Router();

// 🛒 Cart
router.post("/cart/add", isAuth, addToCart);
router.get("/cart", isAuth, getCart);
router.delete("/cart/:id", isAuth, removeFromCart);
router.delete("/cart", isAuth, clearCart);

// 📦 Order
router.post("/order/create", isAuth, createOrder);
router.get("/order/my-orders", isAuth, getMyOrders);
router.put("/order/:id/status", isAuth, isAdmin, updateOrderStatus);

export default router;
