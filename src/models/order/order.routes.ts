import express from "express";
import { isAuth } from "../../middlewares/isAuth";
import { decryptBody } from "../../middlewares/decryptBody";
import { isDashboardAccess } from "../../middlewares/isDashboardAccess";
import {
  confirmManualPayment,
  createManualOrder,
  createOrder,
  deleteOrder,
  getAllOrders,
  getMyOrders,
  getOrderDetails,
  getOrdersByStatus,
  ManualPayment,
  payDueAmount,
  updateOrderStatus,
  updateDropshippingOrderStatus,
  getDropshippingOrderDetails,
  addOrderMessage,
  updateOrderKeyPoints
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
router.post("/manual", isAuth, decryptBody, createManualOrder);

/**
 * @route   GET /api/orders/my-orders
 * @desc    Get all orders of logged-in user
 * @access  Private (User)
 */
router.get("/my-orders", isAuth, getMyOrders);
router.get("/:id", isAuth, getOrderDetails);
router.post("/manual-payment", isAuth, decryptBody, ManualPayment);
router.post("/:id/pay-due", isAuth, payDueAmount);

/**
 * @route   GET /api/orders/admin/all
 * @desc    Get all orders (admin, manager, cpo)
 * @access  Private (Admin/Manager/CPO)
 */
router.get("/admin/all", isAuth, isDashboardAccess("orders"), getAllOrders);

/**
 * @route   GET /api/orders/admin/status/:status
 * @desc    Get orders by status (admin, manager, cpo)
 * @access  Private (Admin/Manager/CPO)
 */
router.get("/admin/status/:status", isAuth, isDashboardAccess("orders"), getOrdersByStatus);

/**
 * @route   GET /api/orders/dropshipping/:id
 * @desc    Get dropshipping order details with status history (Admin/Manager/CPO)
 * @access  Private (Admin/Manager/CPO)
 */
router.get("/dropshipping/:id", isAuth, isDashboardAccess("orders"), getDropshippingOrderDetails);

/**
 * @route   PUT /api/orders/dropshipping/:id/status
 * @desc    Update dropshipping order status with additional details (Admin/Manager/CPO)
 * @access  Private (Admin/Manager/CPO)
 */
router.put("/dropshipping/:id/status", isAuth, isDashboardAccess("orders"), updateDropshippingOrderStatus);

/**
 * @route   POST /api/orders/dropshipping/:id/message
 * @desc    Send admin message to dropshipper on specific order (Admin/Manager/CPO)
 * @access  Private (Admin/Manager/CPO)
 */
router.post("/dropshipping/:id/message", isAuth, isDashboardAccess("orders"), addOrderMessage);

/**
 * @route   PUT /api/orders/dropshipping/:id/keypoints
 * @desc    Update order key points (Admin/Manager/CPO)
 * @access  Private (Admin/Manager/CPO)
 */
router.put("/dropshipping/:id/keypoints", isAuth, isDashboardAccess("orders"), updateOrderKeyPoints);

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (Admin/Manager/CPO)
 * @access  Private (Admin/Manager/CPO)
 */
router.put("/:id/status", isAuth, isDashboardAccess("orders"), updateOrderStatus);

/**
 * @route   PUT /api/orders/admin/:id/verify
 * @desc    Confirm manual payment (Admin/Manager/CPO)
 * @access  Private (Admin/Manager/CPO)
 */
router.put("/admin/:id/verify", isAuth, isDashboardAccess("orders"), confirmManualPayment);

/**
 * @route   DELETE /api/orders/:id
 * @desc    Delete an order by ID (Admin/Manager/CPO)
 * @access  Private (Admin/Manager/CPO)
 */
router.delete("/:id", isAuth, isDashboardAccess("orders"), deleteOrder);

export default router;
