import express from "express";
import { isAdmin } from "../../middlewares/isAdmin";
import { isAuth } from "../../middlewares/isAuth";
import {
  createOrder,
  getMyOrders,
  ManualPayment,
  updateOrderStatus
} from "../order/order.controllers";

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
router.post("/manual-payment", isAuth, ManualPayment);


/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (admin only)
 * @access  Private (Admin)
 */
router.put("/:id/status", isAuth, isAdmin, updateOrderStatus);
// router.post("/manual-payment", isAuth, ManualPayment)

export default router;
