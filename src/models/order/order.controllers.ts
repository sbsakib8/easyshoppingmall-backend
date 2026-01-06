import { Request, Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../middlewares/isAuth";
import { CartModel } from "../cart/cart.model"; // ✅ fix typo (card → cart)
import { AuthUser } from "./interface";
import OrderModel from "./order.model";
const { v4: uuidv4 } = require('uuid');

/**
 * Extending Express Request to include user
 */
interface RequestWithUser extends Request {
  user?: AuthUser;
}

/**
 * @desc Create a new order from user's cart
 * @route POST /api/orders/create
 * @access Private (User)
 */
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { userId, delivery_address, paymentMethod, paymentDetails, payment_type } = req.body;
    const subtotalFromReq = Number(req.body.subtotal) || 0;
    const deliveryChargeFromReq = Number(req.body.deliveryCharge) || 0;

    if (!userId || !delivery_address) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (userId, delivery_address)",
      });
    }

    const cart = await CartModel.findOne({ userId }).populate("products.productId");

    if (!cart || cart.products.length === 0) {
      return res.status(404).json({ success: false, message: "Cart is empty" });
    }

    const validProducts = cart.products.filter(
      (item: any) => item.productId && "_id" in item.productId
    );

    if (validProducts.length === 0) {
      return res.status(400).json({ success: false, message: "No valid products in cart" });
    }

    const orderProducts = validProducts.map((item: any) => {
      const product = item.productId;
      const productPrice = Number(product.price) || 0; // Ensure productPrice is a number, default to 0
      const quantity = Number(item.quantity) || 0; // Ensure quantity is a number, default to 0
      return {
        productId: product._id,
        name: product.productName || "Unnamed Product",
        image: product.images || [],
        quantity: quantity,
        price: productPrice,
        totalPrice: quantity * productPrice, // Calculate totalPrice using the numeric values
        size: item.size,
      };
    });

    // Create order
    const order = new OrderModel({
      userId,
      orderId: uuidv4(),
      products: orderProducts,
      delivery_address,
      payment_method: req.body.payment_method || "manual", // manual or sslcommerz
      payment_status: "pending", // manual always pending
      payment_details: paymentDetails || undefined,
      payment_type: payment_type || undefined,
      order_status: "pending",
      deliveryCharge: deliveryChargeFromReq,
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: order,
    });
  } catch (error: any) {
    console.error("Order Creation Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc Get all orders for logged-in user
 * @route GET /api/orders/my-orders
 * @access Private (User)
 */
export const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized user" });
      return;
    }

    const orders = await OrderModel.find({ userId })
      .populate("products.productId")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: "User orders fetched successfully",
      data: orders,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc Update order status (Admin only)
 * @route PUT /api/orders/:id/status
 * @access Private (Admin)
 */
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ success: false, message: "Status is required" });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
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

    const order = await OrderModel.findByIdAndUpdate(
      id,
      { order_status: status },
      { new: true }
    );

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    res.json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// POST /order/manual-payment
export const ManualPayment = async (req: Request, res: Response) => {
  try {
    const { orderId, phoneNumber, transactionId, manualFor } = req.body;

    if (!orderId || !phoneNumber || !transactionId) {
      return res.status(400).json({
        success: false,
        message: "Order ID, phone number, and transaction ID are required",
      });
    }

    const order = await OrderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Save manual payment info but keep status pending
    order.payment_method = "manual";
    order.payment_details = { providerNumber: phoneNumber, transactionId, manualFor };
    order.payment_status = "pending"; // ❌ DO NOT mark as paid yet
    order.order_status = "pending";   // still pending admin confirmation

    await order.save();

    res.json({
      success: true,
      message: "Manual payment submitted, pending admin confirmation",
      order,
    });
  } catch (err: any) {
    console.error("Manual Payment Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


/**
 * @desc Get all orders for admin
 * @route GET /api/admin/orders/all
 * @access Private (Admin)
 */
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await OrderModel.find()
      .populate("products.productId")
      .populate("userId", "name email") // Populate user details
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: "All orders fetched successfully",
      data: orders,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc Get orders by status for admin
 * @route GET /api/admin/orders/status/:status
 * @access Private (Admin)
 */
export const getOrdersByStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.params;

    if (!status) {
      res.status(400).json({ success: false, message: "Order status is required" });
      return;
    }

    const orders = await OrderModel.find({ order_status: status })
      .populate("products.productId")
      .populate("userId", "name email") // Populate user details
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: `Orders with status "${status}" fetched successfully`,
      data: orders,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc Confirm manual payment for an order (Admin only)
 * @route PUT /api/orders/:id/confirm-payment
 * @access Private (Admin)
 */
export const confirmManualPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID" });
    }

    const order = await OrderModel.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.payment_method !== 'manual') {
      return res.status(400).json({ success: false, message: "This is not a manual payment order." });
    }

    if (order.payment_status === 'paid') {
      return res.status(400).json({ success: false, message: "This order has already been paid." });
    }

    // Update payment status
    order.payment_status = "paid";
    order.order_status = "processing";

    // Calculate amount_paid and amount_due based on payment type
    if (order.payment_type === "delivery") {
      order.amount_paid = order.deliveryCharge;
      order.amount_due = order.subTotalAmt;
    } else { // "full" payment
      order.amount_paid = order.totalAmt;
      order.amount_due = 0;
    }

    await order.save();

    // Clear the user's cart
    const cart = await CartModel.findOne({ userId: order.userId });
    if (cart) {
      cart.products = [];
      cart.subTotalAmt = 0;
      cart.totalAmt = 0;
      await cart.save();
    }

    res.json({
      success: true,
      message: "Manual payment confirmed successfully",
      data: order,
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};