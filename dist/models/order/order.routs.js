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
 * @desc    Create a new order from user's cart
 * @access  Private (User)
 */
router.post("/create", order_controllers_1.createOrder);
/**
 * @route   GET /api/orders/my-orders
 * @desc    Get all orders of logged-in user
 * @access  Private (User)
 */
router.get("/my-orders", isAuth_1.isAuth, order_controllers_1.getMyOrders);
router.post("/manual-payment", isAuth_1.isAuth, order_controllers_1.ManualPayment);
/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (admin only)
 * @access  Private (Admin)
 */
router.put("/:id/status", isAuth_1.isAuth, isAdmin_1.isAdmin, order_controllers_1.updateOrderStatus);
// router.post("/manual-payment", isAuth, ManualPayment)
exports.default = router;
