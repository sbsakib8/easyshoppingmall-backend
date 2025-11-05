"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatus = exports.getMyOrders = exports.createOrder = void 0;
const { v4: uuidv4 } = require('uuid');
const mongoose_1 = __importDefault(require("mongoose"));
const cardproduct_model_1 = require("../cart/cardproduct.model"); // ✅ fix typo (card → cart)
const order_model_1 = __importDefault(require("./order.model"));
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
        // Fetch cart with populated product info
        const cart = await cardproduct_model_1.CartModel.findOne({ userId }).populate("products.productId");
        if (!cart || cart.products.length === 0) {
            res.status(404).json({ success: false, message: "Cart is empty" });
            return;
        }
        // Filter valid, populated products
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
        // Transform cart items into order format
        const orderProducts = validProducts.map((item) => {
            const product = item.productId;
            return {
                productId: product._id,
                name: product.name ?? "Unknown Product",
                image: product.image ?? [],
                quantity: item.quantity,
                price: item.price,
                totalPrice: item.totalPrice,
            };
        });
        // Create the order
        const order = new order_model_1.default({
            userId,
            orderId: uuidv4(),
            products: orderProducts,
            subTotalAmt: cart.subTotalAmt,
            totalAmt: cart.totalAmt,
            delivery_address,
        });
        await order.save();
        // Clear the cart
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
