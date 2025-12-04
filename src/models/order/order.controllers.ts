import { Request, Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../middlewares/isAuth";
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
    const {
      userId,
      products,
      payment_method,
      delivery_address,
    } = req.body;

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
      products: products.map((p: any) => ({
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

    const newOrder = new OrderModel(orderData);
    await newOrder.save();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: newOrder,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
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
  } catch (err) {
    console.error("Manual Payment Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};