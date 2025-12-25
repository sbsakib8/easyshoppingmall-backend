"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManualPayment = exports.updateOrderStatus = exports.getMyOrders = exports.createOrder = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const cardproduct_model_1 = require("../cart/cardproduct.model"); // ✅ fix typo (card → cart)
const order_model_1 = __importDefault(require("./order.model"));
const { v4: uuidv4 } = require('uuid');
/**
 * @desc Create a new order from user's cart
 * @route POST /api/orders/create
 * @access Private (User)
 */
/**
 * @desc Create a new order from user's cart
 * @route POST /api/orders/create
 * @access Private (User)
 */
const createOrder = async (req, res) => {
    try {
        const { userId, delivery_address, paymentMethod, paymentDetails } = req.body;
        if (!userId || !delivery_address) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields (userId, delivery_address)",
            });
        }
        const cart = await cardproduct_model_1.CartModel.findOne({ userId }).populate("products.productId");
        if (!cart || cart.products.length === 0) {
            return res.status(404).json({ success: false, message: "Cart is empty" });
        }
        const validProducts = cart.products.filter((item) => item.productId && "_id" in item.productId);
        if (validProducts.length === 0) {
            return res.status(400).json({ success: false, message: "No valid products in cart" });
        }
        const orderProducts = validProducts.map((item) => {
            const product = item.productId;
            return {
                productId: product._id,
                name: product.productName || "Unnamed Product",
                image: product.images || [],
                quantity: item.quantity,
                price: item.price,
                totalPrice: item.totalPrice,
                size: item.size,
            };
        });
        // Create order
        const order = new order_model_1.default({
            userId,
            orderId: uuidv4(),
            products: orderProducts,
            delivery_address,
            payment_method: paymentMethod || "manual", // manual or sslcommerz
            payment_status: "pending", // manual always pending
            payment_details: paymentDetails || undefined,
            order_status: "pending",
        });
        await order.save();
        // Clear cart
        cart.products = [];
        cart.subTotalAmt = 0;
        cart.totalAmt = 0;
        await cart.save();
        res.status(201).json({
            success: true,
            message: "Order placed successfully",
            data: order,
        });
    }
    catch (error) {
        console.error("Order Creation Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
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
        const { orderId, providerNumber, transactionId, manualFor } = req.body;
        if (!orderId || !providerNumber || !transactionId) {
            return res.status(400).json({
                success: false,
                message: "Order ID, phone number, and transaction ID are required",
            });
        }
        const order = await order_model_1.default.findOne({ orderId });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        // Save manual payment info but keep status pending
        order.payment_method = "manual";
        order.payment_details = { providerNumber, transactionId, manualFor };
        order.payment_status = "pending"; // ❌ DO NOT mark as paid yet
        order.order_status = "pending"; // still pending admin confirmation
        await order.save();
        res.json({
            success: true,
            message: "Manual payment submitted, pending admin confirmation",
            order,
        });
    }
    catch (err) {
        console.error("Manual Payment Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.ManualPayment = ManualPayment;
