"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const isAdmin_1 = require("../../middlewares/isAdmin");
const isAuth_1 = require("../../middlewares/isAuth");
const order_controllers_1 = require("../order/order.controllers");
const router = express_1.default.Router();
/**
 * @route   POST /api/orders/create
 * @desc    Create a new generic order from user's cart (can be used for SSLCommerz)
 * @access  Private (User)
 */
router.post("/create", isAuth_1.isAuth, order_controllers_1.createOrder);
/**
 * @route   POST /api/orders/manual
 * @desc    Create a new manual order from user's cart
 * @access  Private (User)
 */
router.post("/manual", isAuth_1.isAuth, order_controllers_1.createManualOrder);
/**
 * @route   GET /api/orders/my-orders
 * @desc    Get all orders of logged-in user
 * @access  Private (User)
 */
router.get("/my-orders", isAuth_1.isAuth, order_controllers_1.getMyOrders);
router.post("/manual-payment", isAuth_1.isAuth, order_controllers_1.ManualPayment);
/**
 * @route   GET /api/orders/admin/all
 * @desc    Get all orders (admin only)
 * @access  Private (Admin)
 */
router.get("/admin/all", isAuth_1.isAuth, isAdmin_1.isAdmin, order_controllers_1.getAllOrders);
/**
 * @route   GET /api/orders/admin/status/:status
 * @desc    Get orders by status (admin only)
 * @access  Private (Admin)
 */
router.get("/admin/status/:status", isAuth_1.isAuth, isAdmin_1.isAdmin, order_controllers_1.getOrdersByStatus);
/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (admin only)
 * @access  Private (Admin)
 */
router.put("/:id/status", isAuth_1.isAuth, isAdmin_1.isAdmin, order_controllers_1.updateOrderStatus);
/**
 * @route   PATCH /api/admin/orders/:id/verify
 * @desc    Confirm manual payment by admin
 * @access  Private (Admin)
 */
router.put("/admin/orders/:id/verify", isAuth_1.isAuth, isAdmin_1.isAdmin, order_controllers_1.confirmManualPayment);
/**
 * @route   DELETE /api/orders/:id
 * @desc    Delete an order by ID (Admin only)
 * @access  Private (Admin)
 */
router.delete("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, order_controllers_1.deleteOrder);
exports.default = router;
