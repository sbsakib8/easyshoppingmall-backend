"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmManualPayment = exports.getOrdersByStatus = exports.getAllOrders = exports.createManualOrder = exports.ManualPayment = exports.updateOrderStatus = exports.getMyOrders = exports.createOrder = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const cart_utils_1 = require("../../utils/cart.utils");
const cart_model_1 = require("../cart/cart.model");
const user_model_1 = __importDefault(require("../user/user.model"));
const order_model_1 = __importDefault(require("./order.model"));
const { v4: uuidv4 } = require('uuid');
/**
 * @desc Create a new order from user's cart
 * @route POST /api/orders/create
 * @access Private (User)
 */
const createOrder = async (req, res) => {
    try {
        const { delivery_address, payment_method, payment_details, payment_type } = req.body; // Renamed paymentMethod to payment_method, paymentDetails to payment_details
        const userId = req.userId; // Get userId from AuthRequest
        const subtotalFromReq = Number(req.body.subtotal) || 0; // Not used in this version after product price calculation
        const deliveryChargeFromReq = Number(req.body.deliveryCharge) || 0;
        if (!userId || !delivery_address) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields (userId, delivery_address)",
            });
        }
        // Validate delivery_address structure
        const requiredAddressFields = ["address_line", "district", "division", "upazila_thana", "pincode", "country", "mobile"];
        const missingAddressFields = requiredAddressFields.filter(field => !delivery_address[field]);
        if (missingAddressFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required address fields: ${missingAddressFields.join(", ")}`,
            });
        }
        const cart = await cart_model_1.CartModel.findOne({ userId }).populate("products.productId");
        if (!cart || cart.products.length === 0) {
            return res.status(404).json({ success: false, message: "Cart is empty" });
        }
        const validProducts = cart.products.filter((item) => item.productId && "_id" in item.productId);
        if (validProducts.length === 0) {
            return res.status(400).json({ success: false, message: "No valid products in cart" });
        }
        const orderProducts = validProducts.map((item) => {
            const product = item.productId;
            const productPrice = Number(product.price) || 0;
            const quantity = Number(item.quantity) || 0;
            return {
                productId: product._id,
                name: product.productName || "Unnamed Product",
                image: product.images || [],
                quantity: quantity,
                price: productPrice,
                totalPrice: quantity * productPrice,
                size: item.size,
            };
        });
        // Create order
        const order = new order_model_1.default({
            userId,
            cart: cart._id, // Assign cart ID
            orderId: uuidv4(),
            products: orderProducts,
            address: delivery_address, // Changed to address
            payment_method: payment_method, // payment_method must be explicit
            payment_status: "pending",
            payment_details: payment_details || null, // Expect payment_details for non-manual
            payment_type: payment_type || "full",
            order_status: "pending",
            deliveryCharge: deliveryChargeFromReq,
        });
        if (!payment_method) {
            return res.status(400).json({
                success: false,
                message: "Payment method is required for this endpoint.",
            });
        }
        await order.save();
        // Cart will be cleared after payment is confirmed (in paymentSuccess, confirmManualPayment, paymentIpn)
        await user_model_1.default.findByIdAndUpdate(userId, {
            $push: { orderHistory: order._id },
        });
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
        const allowedStatuses = ["pending", "processing", "shipped", "delivered", "cancelled", "completed"];
        if (!allowedStatuses.includes(status)) {
            res.status(400).json({
                success: false,
                message: `Invalid status provided. Allowed statuses are: ${allowedStatuses.join(", ")}`,
            });
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
        const { orderId, provider, senderNumber, transactionId, payment_type } = req.body;
        if (!orderId || !provider || !senderNumber || !transactionId) {
            return res.status(400).json({
                success: false,
                message: "Order ID, provider, sender number, and transaction ID are required.",
            });
        }
        const allowedManualProviders = ["bkash", "nagad", "rocket", "upay"];
        if (!allowedManualProviders.includes(provider)) {
            return res.status(400).json({
                success: false,
                message: `Invalid manual payment provider. Must be one of: ${allowedManualProviders.join(", ")}.`,
            });
        }
        const order = await order_model_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        if (order.payment_method !== 'manual') {
            return res.status(400).json({ success: false, message: "This order is not set for manual payment." });
        }
        if (order.payment_status === 'submitted' || order.payment_status === 'paid') {
            return res.status(400).json({ success: false, message: "Payment info already submitted or payment already made." });
        }
        // Update payment status and details
        order.payment_details = {
            manual: {
                provider: provider,
                senderNumber: senderNumber,
                transactionId: transactionId,
                paidFor: order.payment_type,
            },
        };
        order.payment_status = "submitted";
        // order_status remains 'pending' until admin verification
        if (payment_type) {
            order.payment_type = payment_type;
        }
        await order.save();
        // Add the order to the user's order history
        await user_model_1.default.findByIdAndUpdate(order.userId, {
            $push: { orderHistory: order._id },
        });
        res.json({
            success: true,
            message: "Manual payment info submitted, pending admin confirmation",
            order,
        });
    }
    catch (err) {
        console.error("Manual Payment Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.ManualPayment = ManualPayment;
/**
 * @desc Create a new manual order from user's cart
 * @route POST /api/orders/manual
 * @access Private (User)
 */
const createManualOrder = async (req, res) => {
    try {
        const { delivery_address } = req.body;
        const userId = req.userId;
        if (!userId || !delivery_address) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields (userId, delivery_address)",
            });
        }
        // Validate delivery_address structure
        const requiredAddressFields = ["address_line", "district", "division", "upazila_thana", "country", "mobile"];
        const missingAddressFields = requiredAddressFields.filter(field => !delivery_address[field]);
        if (missingAddressFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required address fields: ${missingAddressFields.join(", ")}`,
            });
        }
        const cart = await cart_model_1.CartModel.findOne({ userId }).populate("products.productId");
        if (!cart || cart.products.length === 0) {
            return res.status(404).json({ success: false, message: "Cart is empty" });
        }
        const validProducts = cart.products.filter((item) => item.productId && "_id" in item.productId);
        if (validProducts.length === 0) {
            return res.status(400).json({ success: false, message: "No valid products in cart" });
        }
        const deliveryChargeFromReq = Number(req.body.deliveryCharge) || 0;
        const orderProducts = validProducts.map((item) => {
            const product = item.productId;
            const productPrice = Number(product.price) || 0;
            const quantity = Number(item.quantity) || 0;
            return {
                productId: product._id,
                name: product.productName || "Unnamed Product",
                image: product.images || [],
                quantity: quantity,
                price: productPrice,
                totalPrice: quantity * productPrice,
                size: item.size ?? null,
                color: item.color ?? null,
                weight: item.weight ?? null,
            };
        });
        // Create manual order
        const order = new order_model_1.default({
            userId,
            cart: cart._id,
            orderId: uuidv4(),
            products: orderProducts,
            address: delivery_address,
            payment_method: "manual",
            payment_status: "pending",
            payment_details: {},
            payment_type: req.body.payment_type,
            order_status: "pending",
            deliveryCharge: deliveryChargeFromReq,
        });
        await order.save();
        await user_model_1.default.findByIdAndUpdate(userId, {
            $push: { orderHistory: order._id },
        });
        // Clear the user's cart
        await (0, cart_utils_1.clearUserCart)(userId);
        res.status(201).json({
            success: true,
            message: "Manual order placed successfully",
            data: order,
        });
    }
    catch (error) {
        console.error("Manual Order Creation Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
exports.createManualOrder = createManualOrder;
/**
 * @desc Get all orders for admin
 * @route GET /api/admin/orders/all
 * @access Private (Admin)
 */
const getAllOrders = async (req, res) => {
    try {
        const orders = await order_model_1.default.find()
            .populate("products.productId")
            .populate("userId", "name email") // Populate user details
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            message: "All orders fetched successfully",
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
exports.getAllOrders = getAllOrders;
/**
 * @desc Get orders by status for admin
 * @route GET /api/admin/orders/status/:status
 * @access Private (Admin)
 */
const getOrdersByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        if (!status) {
            res.status(400).json({ success: false, message: "Order status is required" });
            return;
        }
        const orders = await order_model_1.default.find({ order_status: status })
            .populate("products.productId")
            .populate("userId", "name email") // Populate user details
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            message: `Orders with status "${status}" fetched successfully`,
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
exports.getOrdersByStatus = getOrdersByStatus;
/**
 * @desc Confirm manual payment for an order (Admin only)
 * @route PUT /api/orders/:id/confirm-payment
 * @access Private (Admin)
 */
const confirmManualPayment = async (req, res) => {
    try {
        const { id } = req.params; // this is orderId (UUID)
        const order = await order_model_1.default.findOne({ orderId: id });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        if (order.payment_method !== "manual") {
            return res.status(400).json({ success: false, message: "Not a manual payment order" });
        }
        if (order.payment_status !== "submitted") {
            return res.status(400).json({
                success: false,
                message: "Manual payment not submitted or already processed",
            });
        }
        const allowedManualProviders = ["bkash", "nagad", "rocket", "upay"];
        const submittedProvider = order.payment_details?.manual?.provider;
        if (!submittedProvider || !allowedManualProviders.includes(submittedProvider)) {
            return res.status(400).json({
                success: false,
                message: `Invalid or missing manual payment provider in submission. Must be one of: ${allowedManualProviders.join(", ")}.`,
            });
        }
        order.payment_status = "paid";
        order.order_status = "processing";
        // Ensure totalAmt and subTotalAmt are up-to-date before calculating paid/due amounts
        await order.save(); // This will trigger the pre-save hook to recalculate totals
        const updatedOrder = await order_model_1.default.findById(order._id); // Re-fetch the updated order document
        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: "Order not found after update" });
        }
        if (updatedOrder.payment_type === "delivery") {
            updatedOrder.amount_paid = updatedOrder.deliveryCharge;
            updatedOrder.amount_due = updatedOrder.totalAmt - updatedOrder.deliveryCharge;
        }
        else { // Handles 'full' payment type
            updatedOrder.amount_paid = updatedOrder.totalAmt;
            updatedOrder.amount_due = 0;
        }
        await updatedOrder.save(); // Save the order with updated paid/due amounts
        // ✅ CLEAR CART
        await (0, cart_utils_1.clearUserCart)(order.userId);
        res.json({
            success: true,
            message: "Manual payment confirmed successfully",
            data: order,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.confirmManualPayment = confirmManualPayment;
