import { Request, Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../middlewares/isAuth";
import { clearUserCart } from "../../utils/cart.utils";
import { CartModel } from "../cart/cart.model";
import UserModel from "../user/user.model";
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
export const createOrder = async (req: AuthRequest, res: Response) => { // Changed Request to AuthRequest
  try {
    const { delivery_address, payment_method, payment_details, payment_type } = req.body; // Renamed paymentMethod to payment_method, paymentDetails to payment_details
    const userId = req.userId; // Get userId from AuthRequest
    const subtotalFromReq = Number(req.body.subtotal) || 0; // Not used in this version after product price calculation

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


    const cart = await CartModel.findOne({ userId }).populate({
      path: "products.productId",
      populate: [
        { path: "category", model: "Category" },
        { path: "subCategory", model: "SubCategory" }
      ]
    });

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
        color: item.color,
        weight: item.weight,
      };
    });

    // Create order
    if (!payment_method) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required for this endpoint.",
      });
    }

    // Verify Delivery Charge on Server
    const dhakaDistricts = [
      "Dhaka", "ঢাকা", "Dhanmondi", "Gulshan", "Mirpur", "Motijheel",
      "Uttara", "Mohammadpur", "Tejgaon", "Kamrangirchar"
    ];
    let calculatedDeliveryCharge = 130;

    if (delivery_address?.district) {
      const district = delivery_address.district;
      if (dhakaDistricts.some(d => district.includes(d))) {
        calculatedDeliveryCharge = 80;
      }
    }

    // Create order
    const order = new OrderModel({
      userId,
      cart: cart._id,
      orderId: uuidv4(),
      products: orderProducts,
      address: delivery_address,
      payment_method: payment_method,
      payment_status: "pending",
      payment_details: payment_details || null,
      payment_type: payment_type || "full",
      order_status: "pending",
      deliveryCharge: calculatedDeliveryCharge,
    });

    await order.save();
    // Cart will be cleared after payment is confirmed (in paymentSuccess, confirmManualPayment, paymentIpn)
    await UserModel.findByIdAndUpdate(userId, {
      $push: { orderHistory: order._id },
    });

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

export const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized user" });
      return;
    }

    const orders = await OrderModel.find({ userId })
      .populate({
        path: "products.productId",
        populate: [
          { path: "category", model: "Category" },
          { path: "subCategory", model: "SubCategory" }
        ]
      })
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
    ).populate("userId", "name email");

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

    const allowedManualProviders = ["bkash", "nagad", "rocket", "upay"];
    if (!allowedManualProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        message: `Invalid manual payment provider. Must be one of: ${allowedManualProviders.join(", ")}`,
      });
    }

    // ❌ HARD BLOCK: duplicate transactionId (cloud-safe)
    const existingTxn = await OrderModel.findOne({ transactionId });
    if (existingTxn) {
      return res.status(409).json({
        success: false,
        message: "This transaction ID has already been used.",
      });
    }

    /**
     * 🔒 ATOMIC UPDATE (CRITICAL)
     * - Order must be manual
     * - Payment must be pending
     * - transactionId must not exist
     */
    const order = await OrderModel.findOneAndUpdate(
      {
        _id: orderId,
        payment_method: "manual",
        payment_status: "pending",
        transactionId: { $exists: false },
      },
      {
        $set: {
          transactionId,
          payment_status: "submitted",
          payment_details: {
            manual: {
              provider,
              senderNumber,
              transactionId,
              paidFor: undefined, // backend decides below
            },
          },
        },
      },
      { new: true }
    );

    if (!order) {
      return res.status(409).json({
        success: false,
        message: "Order not found or payment already submitted.",
      });
    }

    // ==============================
    // 🧠 BACKEND-CONTROLLED LOGIC
    // ==============================
    if (order.payment_type === "delivery") {
      order.amount_paid = order.deliveryCharge;
      order.amount_due = order.totalAmt - order.deliveryCharge;
    } else {
      order.amount_paid = order.totalAmt;
      order.amount_due = 0;
    }

    order.payment_details!.manual!.paidFor = order.payment_type;

    await order.save();

    // ✅ Add order to user's history (idempotent safe)
    await UserModel.findByIdAndUpdate(order.userId, {
      $addToSet: { orderHistory: order._id },
    });

    return res.json({
      success: true,
      message: "Manual payment info submitted, pending admin confirmation",
      order,
    });
  } catch (err: any) {
    console.error("Manual Payment Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



/**
 * @desc Create a new manual order from user's cart
 * @route POST /api/orders/manual
 * @access Private (User)
 */
export const createManualOrder = async (req: AuthRequest, res: Response) => {
  let order: any = null;

  try {
    const { delivery_address, payment_details, payment_type, payment_method } = req.body;
    const userId = req.userId;

    // ✅ 1. Basic validation
    if (!userId || !delivery_address) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (userId, delivery_address)",
      });
    }

    // ✅ 2. Validate delivery_address
    const requiredAddressFields = [
      "address_line",
      "district",
      "division",
      "upazila_thana",
      "country",
      "mobile",
    ];
    const missingFields = requiredAddressFields.filter(field => !delivery_address[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required address fields: ${missingFields.join(", ")}`,
      });
    }

    // ✅ 3. Validate cart
    const cart = await CartModel.findOne({ userId }).populate({
      path: "products.productId",
      populate: [
        { path: "category", model: "Category" },
        { path: "subCategory", model: "SubCategory" }
      ]
    });
    if (!cart || cart.products.length === 0) {
      return res.status(404).json({ success: false, message: "Cart is empty" });
    }

    // Type-safe check for valid products
    const validProducts = cart.products.filter((item: any) => {
      const product = item.productId;
      // Only keep if product is an object and has _id
      return product && typeof product === "object" && "_id" in product;
    });
    if (validProducts.length === 0) {
      return res.status(400).json({ success: false, message: "No valid products in cart" });
    }

    const orderProducts = validProducts.map((item: any) => {
      const product = item.productId;
      const quantity = Number(item.quantity) || 0;
      const price = Number(product.price) || 0;

      return {
        productId: product._id,
        name: product.productName || "Unnamed Product",
        image: product.images || [],
        quantity,
        price,
        totalPrice: quantity * price,
        size: item.size ?? null,
        color: item.color ?? null,
        weight: item.weight ?? null,
      };
    });

    // ✅ 4. Manual payment validation & duplicate check
    if (payment_method === "manual") {
      if (!payment_details || !payment_details.transactionId) {
        return res.status(400).json({
          success: false,
          message: "Transaction ID is required for manual payment",
        });
      }

      const existingOrder = await OrderModel.findOne({
        payment_method: "manual",
        "payment_details.manual.transactionId": payment_details.transactionId,
      });

      if (existingOrder) {
        return res.status(400).json({
          success: false,
          message: "এই ট্রানজ্যাকশন আইডি ইতিমধ্যেই ব্যবহার হয়েছে!",
        });
      }
    }

    // Verify Delivery Charge on Server
    const dhakaDistricts = [
      "Dhaka", "ঢাকা", "Dhanmondi", "Gulshan", "Mirpur", "Motijheel",
      "Uttara", "Mohammadpur", "Tejgaon", "Kamrangirchar"
    ];
    let calculatedDeliveryCharge = 130;

    if (delivery_address?.district) {
      const district = delivery_address.district;
      if (dhakaDistricts.some(d => district.includes(d))) {
        calculatedDeliveryCharge = 80;
      }
    }

    // ✅ 5. Create order
    order = new OrderModel({
      userId,
      cart: cart._id,
      orderId: uuidv4(),
      products: orderProducts,
      address: delivery_address,
      payment_method,
      payment_type,
      payment_details: payment_details || {},
      order_status: "pending",
      deliveryCharge: calculatedDeliveryCharge,
    });

    await order.save();

    // ✅ 6. Update user's order history
    await UserModel.findByIdAndUpdate(userId, {
      $push: { orderHistory: order._id },
    });

    // ✅ 7. Clear user's cart
    await clearUserCart(userId);

    // ✅ 8. Respond success
    return res.status(201).json({
      success: true,
      message: "Manual order placed successfully",
      data: order,
    });

  } catch (error: any) {
    console.error("Manual Order Creation Error:", error);

    // ⚠️ Rollback partially created order
    if (order?._id) {
      try {
        await OrderModel.findByIdAndDelete(order._id);
        console.log("Rollback: Deleted partially created order:", order._id);
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    return res.status(500).json({
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
      .populate({
        path: "products.productId",
        populate: [
          { path: "category", model: "Category" },
          { path: "subCategory", model: "SubCategory" }
        ]
      })
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
      .populate({
        path: "products.productId",
        populate: [
          { path: "category", model: "Category" },
          { path: "subCategory", model: "SubCategory" }
        ]
      })
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
    const { id } = req.params; // this is orderId (UUID)

    const order = await OrderModel.findOne({ orderId: id });
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
    const updatedOrder = await OrderModel.findById(order._id); // Re-fetch the updated order document

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: "Order not found after update" });
    }

    if (updatedOrder.payment_type === "delivery") {
      updatedOrder.amount_paid = updatedOrder.deliveryCharge;
      updatedOrder.amount_due = updatedOrder.totalAmt - updatedOrder.deliveryCharge;
    } else { // Handles 'full' payment type
      updatedOrder.amount_paid = updatedOrder.totalAmt;
      updatedOrder.amount_due = 0;
    }

    await updatedOrder.save(); // Save the order with updated paid/due amounts

    // ✅ CLEAR CART
    await clearUserCart(order.userId);

    res.json({
      success: true,
      message: "Manual payment confirmed successfully",
      data: updatedOrder.populate("userId", "name email"),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Delete an order by ID (Admin only)
 * @route DELETE /api/orders/:id
 * @access Private (Admin)
 */
export const deleteOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }

    const order = await OrderModel.findById(id);

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    // Find the user and pull the order from their orderHistory
    await UserModel.findByIdAndUpdate(order.userId, {
      $pull: { orderHistory: order._id },
    });

    // Delete the order
    await OrderModel.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

