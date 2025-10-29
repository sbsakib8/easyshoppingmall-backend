import express from "express";
import {
  createOrder,
  getMyOrders,
  updateOrderStatus,
} from "../order/order.controllers";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";

const router = express.Router();

/**
 * @route   POST /api/orders/create
 * @desc    Create a new order from user's cart
 * @access  Private (User)
 */
router.post("/create", createOrder);

/**
 * @route   GET /api/orders/my-orders
 * @desc    Get all orders of logged-in user
 * @access  Private (User)
 */
router.get("/my-orders", isAuth, getMyOrders);

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (admin only)
 * @access  Private (Admin)
 */
router.put("/:id/status", isAuth, isAdmin, updateOrderStatus);

export default router;
