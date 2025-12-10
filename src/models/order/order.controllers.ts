import { Request, Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../middlewares/isAuth";
import { CartModel } from "../cart/cardproduct.model"; // ✅ fix typo (card → cart)
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
export const createOrder = async (req: Request, res: Response): Promise<void> => {
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
    const cart = await CartModel.findOne({ userId }).populate("products.productId");

    if (!cart || cart.products.length === 0) {
      res.status(404).json({
        success: false,
        message: "Cart is empty",
      });
      return;
    }

    // ✅ Filter valid product entries
    const validProducts = cart.products.filter(
      (item: any) =>
        item.productId &&
        typeof item.productId === "object" &&
        "_id" in item.productId
    );

    if (validProducts.length === 0) {
      res.status(400).json({
        success: false,
        message: "No valid products found in the cart",
      });
      return;
    }

    // ✅ Map cart products to order format
    const orderProducts = validProducts.map((item: any) => {
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
    const order = new OrderModel({
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
    const { orderId } = req.body;

    const order = await OrderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Update order status
    order.payment_status = "paid"; 
    order.order_status = "delivered"; 
    order.payment_method = "manual";

    await order.save();

    res.json({
      success: true,
      message: "Manual payment successful",
      order,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
