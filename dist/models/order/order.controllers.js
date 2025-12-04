"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManualPayment = exports.updateOrderStatus = exports.getMyOrders = exports.createOrder = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const order_model_1 = __importDefault(require("./order.model"));
const { v4: uuidv4 } = require('uuid');
/**
 * @desc Create a new order from user's cart
 * @route POST /api/orders/create
 * @access Private (User)
 */
const createOrder = async (req, res) => {
    try {
        const { userId, products, payment_method, delivery_address, } = req.body;
        if (!userId || !products?.length || !payment_method || !delivery_address) {
            res.status(400).json({
                success: false,
                message: "Missing required fields",
            });
            return;
        }
        const orderId = `ORD-${Date.now()}`;
        const orderData = {
            userId,
            orderId,
            products: products.map((p) => ({
                productId: p.productId,
                name: p.name,
                image: p.image,
                quantity: p.quantity,
                price: p.price,
                selectedColor: p.selectedColor,
                selectedSize: p.selectedSize,
                selectedWeight: p.selectedWeight,
                totalPrice: p.price * p.quantity,
            })),
            payment_method,
            delivery_address,
            subTotalAmt: 0,
            totalAmt: 0,
        };
        const newOrder = new order_model_1.default(orderData);
        await newOrder.save();
        res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: newOrder,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
};
exports.createOrder = createOrder;
/**
 * @desc Get all orders for logged-in user
 * @route GET /api/orders/my-orders
 * @access Private (User)
 */
const getMyOrders = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized user" });
            return;
        }
        const orders = await order_model_1.default.find({ userId })
            .populate("products.productId")
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            message: "User orders fetched successfully",
            data: orders,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
exports.getMyOrders = getMyOrders;
/**
 * @desc Update order status (Admin only)
 * @route PUT /api/orders/:id/status
 * @access Private (Admin)
 */
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            res.status(400).json({ success: false, message: "Status is required" });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: "Invalid order ID" });
            return;
        }
        const order = await order_model_1.default.findByIdAndUpdate(id, { order_status: status }, { new: true });
        if (!order) {
            res.status(404).json({ success: false, message: "Order not found" });
            return;
        }
        res.json({
            success: true,
            message: "Order status updated successfully",
            data: order,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
exports.updateOrderStatus = updateOrderStatus;
// POST /order/manual-payment
const ManualPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await order_model_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        // Correct field names based on schema
        order.payment_status = "paid";
        order.payment_method = "manual";
        // Use a valid enum value
        order.order_status = "delivered";
        await order.save();
        res.json({
            success: true,
            message: "Manual payment successful",
            order,
        });
    }
    catch (err) {
        console.error("Manual Payment Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.ManualPayment = ManualPayment;
