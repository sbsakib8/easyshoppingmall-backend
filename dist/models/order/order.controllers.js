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
const createOrder = async (req, res) => {
    try {
        const { userId, delivery_address } = req.body;
        if (!userId || !delivery_address) {
            res.status(400).json({
                success: false,
                message: "Missing required fields (userId, delivery_address)",
            });
            return;
        }
        // ✅ Fetch cart with populated product details
        const cart = await cardproduct_model_1.CartModel.findOne({ userId }).populate("products.productId");
        if (!cart || cart.products.length === 0) {
            res.status(404).json({
                success: false,
                message: "Cart is empty",
            });
            return;
        }
        // ✅ Filter valid product entries
        const validProducts = cart.products.filter((item) => item.productId &&
            typeof item.productId === "object" &&
            "_id" in item.productId);
        if (validProducts.length === 0) {
            res.status(400).json({
                success: false,
                message: "No valid products found in the cart",
            });
            return;
        }
        // ✅ Map cart products to order format
        const orderProducts = validProducts.map((item) => {
            const product = item.productId;
            return {
                productId: product._id,
                name: product.productName ?? "Unknown Product", // ✅ FIXED field name
                image: product.images ?? [], // ✅ FIXED field name
                quantity: item.quantity,
                price: item.price,
                totalPrice: item.totalPrice,
            };
        });
        // ✅ Create the order
        const order = new order_model_1.default({
            userId,
            orderId: uuidv4(),
            products: orderProducts,
            subTotalAmt: cart.subTotalAmt,
            totalAmt: cart.totalAmt,
            delivery_address,
        });
        await order.save();
        // ✅ Clear the cart after order is placed
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
        const { orderId } = req.body;
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        // Update order status
        order.paymentStatus = "success";
        order.status = "completed";
        order.paymentMethod = "manual";
        await order.save();
        res.json({
            success: true,
            message: "Manual payment successful",
            order,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.ManualPayment = ManualPayment;
