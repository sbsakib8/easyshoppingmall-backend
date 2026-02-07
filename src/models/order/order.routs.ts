import express from "express";
import { isAdmin } from "../../middlewares/isAdmin";
import { isAuth } from "../../middlewares/isAuth";
import {
  confirmManualPayment,
  createManualOrder,
  createOrder,
  deleteOrder,
  getAllOrders,
  getMyOrders,
  getOrdersByStatus,
  ManualPayment,
  updateOrderStatus
} from "../order/order.controllers";

const router = express.Router();

/**
 * @route   POST /api/orders/create
 * @desc    Create a new generic order from user's cart (can be used for SSLCommerz)
 * @access  Private (User)
 */
router.post("/create", isAuth, createOrder);

/**
 * @route   POST /api/orders/manual
 * @desc    Create a new manual order from user's cart
 * @access  Private (User)
 */
router.post("/manual", isAuth, createManualOrder);

/**
 * @route   GET /api/orders/my-orders
 * @desc    Get all orders of logged-in user
 * @access  Private (User)
 */
router.get("/my-orders", isAuth, getMyOrders);
router.post("/manual-payment", isAuth, ManualPayment);

/**
 * @route   GET /api/orders/admin/all
 * @desc    Get all orders (admin only)
 * @access  Private (Admin)
 */
router.get("/admin/all", isAuth, isAdmin, getAllOrders);

/**
 * @route   GET /api/orders/admin/status/:status
 * @desc    Get orders by status (admin only)
 * @access  Private (Admin)
 */
router.get("/admin/status/:status", isAuth, isAdmin, getOrdersByStatus);


/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (admin only)
 * @access  Private (Admin)
 */
router.put("/:id/status", isAuth, isAdmin, updateOrderStatus);

/**
 * @route   PATCH /api/admin/orders/:id/verify
 * @desc    Confirm manual payment by admin
 * @access  Private (Admin)
 */
router.put("/admin/orders/:id/verify", isAuth, isAdmin, confirmManualPayment);

/**
 * @route   DELETE /api/orders/:id
 * @desc    Delete an order by ID (Admin only)
 * @access  Private (Admin)
 */
router.delete("/:id", isAuth, isAdmin, deleteOrder);

export default router;
