import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { IOrder, AuthUser } from "./interface";
import { CartModel } from "../cart/cardproduct.model"; // ✅ fix typo (card → cart)
import OrderModel from "./order.model";

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
export const createOrder = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { addressId } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized user" });
      return;
    }

    if (!addressId) {
      res.status(400).json({ success: false, message: "Delivery address is required" });
      return;
    }

    // ✅ Find single cart for this user
    const cart = await CartModel.findOne({ userId }).populate("products.productId");
    if (!cart || cart.products.length === 0) {
      res.status(400).json({ success: false, message: "Cart is empty" });
      return;
    }

    // ✅ Map products
    const products = cart.products.map((item) => {
      const product: any = item.productId;
      return {
        productId: product?._id ?? item.productId,
        name: product?.productName ?? "Unknown Product",
        image: product?.images ?? [],
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice ?? item.price * item.quantity,
      };
    });

    // ✅ Calculate totals
    const subTotalAmt = products.reduce((acc, p) => acc + (p.totalPrice || 0), 0);
    const totalAmt = subTotalAmt; // You can add tax/shipping logic later

    // ✅ Create new order
    const newOrder = await OrderModel.create({
      userId,
      orderId: `ORD-${uuidv4()}`,
      products,
      delivery_address: addressId,
      payment_status: "pending",
      order_status: "pending",
      subTotalAmt,
      totalAmt,
    } as IOrder);

    // ✅ Clear cart after order
    await CartModel.deleteMany({ userId });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: newOrder,
    });
  } catch (error: any) {
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
export const getMyOrders = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized user" });
      return;
    }

    const orders = await OrderModel.find({ userId })
      .populate("products.productId")
      .populate("delivery_address")
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
