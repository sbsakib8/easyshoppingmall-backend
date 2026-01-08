import { Request, Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../middlewares/isAuth";
import { CartModel } from "../cart/cart.model";
import { AuthUser } from "./interface";
import OrderModel from "./order.model";
import { clearUserCart } from "../../utils/cart.utils";
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
export const createOrder = async (req: AuthRequest, res: Response) => { // Changed Request to AuthRequest
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
    const order = new OrderModel({
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

    if (payment_method === "manual") {
      return res.status(400).json({
        success: false,
        message: "For manual payments, please use the /api/orders/manual endpoint.",
      });
    }

    await order.save();
    // Cart will be cleared after payment is confirmed (in paymentSuccess, confirmManualPayment, paymentIpn)

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
    const { orderId, provider, senderNumber, transactionId } = req.body;

    if (!orderId || !provider || !senderNumber || !transactionId) {
      return res.status(400).json({
        success: false,
        message: "Order ID, provider, sender number, and transaction ID are required.",
      });
    }

    const order = await OrderModel.findById(orderId);
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
        paidFor: "full", // As per requirement for Manual Full Payment
      },
    };
    order.payment_status = "submitted";
    // order_status remains 'pending' until admin verification

    await order.save();

    res.json({
      success: true,
      message: "Manual payment info submitted, pending admin confirmation",
      order,
    });
  } catch (err: any) {
    console.error("Manual Payment Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


/**
 * @desc Create a new manual order from user's cart
 * @route POST /api/orders/manual
 * @access Private (User)
 */
export const createManualOrder = async (req: AuthRequest, res: Response) => {
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
    const requiredAddressFields = ["address_line", "district", "division", "upazila_thana", "pincode", "country", "mobile"];
    const missingAddressFields = requiredAddressFields.filter(field => !delivery_address[field]);
    if (missingAddressFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required address fields: ${missingAddressFields.join(", ")}`,
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

    // Calculate delivery charge (assuming it's either fixed or passed in req.body, but for manual, we might calculate here)
    // For now, let's assume it's calculated from the cart total or fixed,
    // or passed if needed, but for manual payment, it's typically full amount.
    // However, since prompt specified "Manual Full Payment", delivery type might not apply directly.
    // The previous createOrder uses deliveryChargeFromReq, let's reuse that structure for consistency
    const deliveryChargeFromReq = Number(req.body.deliveryCharge) || 0; // if it's passed or 0

    // Create manual order
    const order = new OrderModel({
      userId,
      cart: cart._id,
      orderId: uuidv4(),
      products: orderProducts,
      address: delivery_address,
      payment_method: "manual",
      payment_status: "pending", // As per requirement
      payment_details: {}, // Changed from null to {} to prevent implicit subdocument creation
      payment_type: "full", // As per requirement: "Manual Full Payment"
      order_status: "pending",
      deliveryCharge: deliveryChargeFromReq, // Use calculated or default delivery charge
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: "Manual order placed successfully",
      data: order,
    });
  } catch (error: any) {
    console.error("Manual Order Creation Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
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
    // Only confirm if payment_status is 'submitted'
    if (order.payment_status !== 'submitted') {
      return res.status(400).json({ success: false, message: "Manual payment not yet submitted or already processed." });
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
    await clearUserCart(order.userId); // Clear cart as per API 3 requirement

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