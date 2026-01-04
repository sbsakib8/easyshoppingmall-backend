import { Request, Response } from "express";
import SSLCommerzPayment from "sslcommerz-lts";
import { AuthRequest } from "../../middlewares/isAuth"; // Import AuthRequest
import { CartModel } from "../cart/cart.model";
import OrderModel from "../order/order.model";

/**
 * POST /api/payment/init
 * body: { dbOrderId: string, user: { name, email, phone, address }, method: "manual" | "sslcommerz" }
 */
export const initSslPayment = async (req: AuthRequest, res: Response) => { // Use AuthRequest
  try {
    const { dbOrderId } = req.body; // user is now from req.user
    console.log("Received dbOrderId for payment initiation:", dbOrderId);

    // Ensure user is authenticated and has user data
    if (!req.userId || !req.user) {
      return res.status(401).json({ message: "Unauthorized: User not authenticated" });
    }

    // Check for essential environment variables
    if (!process.env.SSLC_STORE_ID || !process.env.SSLC_STORE_PASSWORD || !process.env.BACKEND_URL) {
      console.error("Missing SSLCommerz or BACKEND_URL environment variables.");
      return res.status(500).json({
        success: false,
        message: "Server configuration error: Missing SSLCommerz credentials or BACKEND_URL.",
      });
    }

    const order = await OrderModel.findById(dbOrderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // ✅ ALWAYS calculate fresh
    const subTotal = order.subTotalAmt || 0;
    const deliveryCharge = order.deliveryCharge || 0;

    const amount =
      order.payment_type === "delivery"
        ? deliveryCharge
        : subTotal + deliveryCharge;

    const sslData = {
      total_amount: Number(amount.toFixed(2)),
      currency: "BDT",
      tran_id: order.orderId,

      product_name:
        order.payment_type === "delivery"
          ? "Delivery Charge"
          : "Products + Delivery",
      product_category: "Ecommerce",
      product_profile: "general",

      cus_name: req.user.name || "Customer", // Use req.user
      cus_email: req.user.email || "customer@example.com", // Use req.user
      cus_phone: req.user.mobile || "N/A", // Use req.user.mobile
      cus_add1: order.delivery_address || "N/A", // Use order delivery address, as AuthUser does not have an address

      success_url: `${process.env.BACKEND_URL}/api/payment/ssl/success`,
      fail_url: `${process.env.BACKEND_URL}/api/payment/ssl/fail`,
      cancel_url: `${process.env.BACKEND_URL}/api/payment/ssl/cancel`,
    };

    const sslcz = new SSLCommerzPayment(
      process.env.SSLCOMMERZ_STORE_ID,
      process.env.SSLCOMMERZ_STORE_PASSWORD,
      false
    );

    const apiResponse = await sslcz.init(sslData);

    console.log("SSLCommerz Init Response:", apiResponse); // Log the full response

    if (apiResponse && apiResponse.GatewayPageURL) {
      order.payment_details = { sessionKey: apiResponse.sessionkey || "" };
      await order.save();
      return res.json({ url: apiResponse.GatewayPageURL });
    } else {
      console.error("SSLCommerz GatewayPageURL not found in apiResponse:", apiResponse);
      return res.status(500).json({ success: false, message: "Failed to initiate SSLCommerz payment: Gateway URL not found." });
    }
  } catch (err) {
    console.error("SSL init error:", err);
    res.status(500).json({ message: "SSL payment initialization failed" });
  }
};


// SUCCESS
export const paymentSuccess = async (req: Request, res: Response) => {
  try {
    const { tran_id } = req.body;

    if (!tran_id) {
      return res.status(400).redirect(`${process.env.FRONTEND_URL}/payment/fail?error=InvalidTransactionID`);
    }

    const order = await OrderModel.findOne({ orderId: tran_id });
    if (!order) {
      return res.status(404).redirect(`${process.env.FRONTEND_URL}/payment/fail?error=OrderNotFound`);
    }

    // =================================================================
    // 🔒 CRITICAL: VALIDATE THE PAYMENT WITH SSLCOMMERZ
    // =================================================================
    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
    if (!storeId || !storePassword) {
      throw new Error("SSLCommerz store ID and password must be set in environment variables.");
    }
    const sslcz = new SSLCommerzPayment(
      storeId,
      storePassword,
      false // false for live, true for sandbox
    );

    const validation = await sslcz.validate(req.body);

    if (validation?.status !== 'VALID' && validation?.status !== 'VALIDATED') {
      // Payment is not valid
      await OrderModel.findOneAndUpdate(
        { orderId: tran_id },
        {
          payment_status: "failed",
          order_status: "cancelled",
          payment_details: req.body
        }
      );
      return res.redirect(`${process.env.FRONTEND_URL}/payment/fail?error=ValidationFailed`);
    }

    // =================================================================
    // ✅ PAYMENT IS VALID - UPDATE ORDER & CART
    // =================================================================

    // Update payment status and details
    order.payment_status = "paid";
    order.order_status = "processing";
    order.payment_details = req.body;

    // Calculate amount_paid and amount_due based on payment type
    if (order.payment_type === "delivery") {
      order.amount_paid = order.deliveryCharge;
      order.amount_due = order.subTotalAmt;
    } else { // "full" payment
      order.amount_paid = order.totalAmt;
      order.amount_due = 0;
    }

    await order.save();

    // Clear user's cart
    const cart = await CartModel.findOne({ userId: order.userId });
    if (cart) {
      cart.products = [];
      cart.subTotalAmt = 0;
      cart.totalAmt = 0;
      await cart.save();
    }

    return res.redirect(`${process.env.FRONTEND_URL}/payment/success?tranId=${tran_id}`);

  } catch (error: any) {
    console.error("Payment Success Error:", error);
    return res.status(500).redirect(`${process.env.FRONTEND_URL}/payment/fail?error=ServerError`);
  }
};

// FAIL
export const paymentFail = async (req: Request, res: Response) => {
  try {
    const { tran_id } = req.body;

    if (tran_id) {
      await OrderModel.findOneAndUpdate(
        { orderId: tran_id },
        {
          payment_status: "failed",
          order_status: "cancelled",
          payment_details: req.body
        },
      );
    }

    return res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);

  } catch (error: any) {
    console.error("Payment Fail Error:", error);
    return res.status(500).redirect(`${process.env.FRONTEND_URL}/payment/fail?error=ServerError`);
  }
};

// CANCEL
export const paymentCancel = async (req: Request, res: Response) => {
  try {
    const { tran_id } = req.body;

    if (tran_id) {
      await OrderModel.findOneAndUpdate(
        { orderId: tran_id },
        {
          payment_status: "failed",
          order_status: "cancelled",
          payment_details: req.body
        }
      );
    }

    return res.redirect(`${process.env.FRONTEND_URL}/payment/cancel`);

  } catch (error: any) {
    console.error("Payment Cancel Error:", error);
    return res.status(500).redirect(`${process.env.FRONTEND_URL}/payment/cancel?error=ServerError`);
  }
};

// IPN - Instant Payment Notification
export const paymentIpn = async (req: Request, res: Response) => {
  try {
    const ipnData = req.body;
    const { tran_id } = ipnData;

    if (!tran_id) {
      return res.status(400).send("IPN: tran_id missing");
    }

    // =================================================================
    // 🔒 CRITICAL: VALIDATE THE IPN DATA WITH SSLCOMMERZ
    // =================================================================
    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
    if (!storeId || !storePassword) {
      throw new Error("SSLCommerz store ID and password must be set in environment variables.");
    }
    const sslcz = new SSLCommerzPayment(
      storeId,
      storePassword,
      false // false for live, true for sandbox
    );

    const validation = await sslcz.validate(ipnData);

    if (validation?.status !== 'VALID' && validation?.status !== 'VALIDATED') {
      // Payment is not valid, log it but don't necessarily fail the order yet,
      // as the primary success/fail handlers are the source of truth.
      console.log(`IPN validation failed for tran_id: ${tran_id}`);
      return res.status(200).send("IPN Handled - Validation Failed");
    }

    // =================================================================
    // ✅ IPN IS VALID - UPDATE ORDER IF IT'S STILL PENDING
    // =================================================================
    const order = await OrderModel.findOne({ orderId: tran_id });
    if (!order) {
      return res.status(404).send("IPN: Order not found");
    }

    // Only update if the primary success handler hasn't already
    if (order.payment_status === "pending") {
      order.payment_status = "paid";
      order.order_status = "processing";
      order.payment_details = ipnData;

      if (order.payment_type === "delivery") {
        order.amount_paid = order.deliveryCharge;
        order.amount_due = order.subTotalAmt;
      } else {
        order.amount_paid = order.totalAmt;
        order.amount_due = 0;
      }

      await order.save();

      const cart = await CartModel.findOne({ userId: order.userId });
      if (cart) {
        cart.products = [];
        cart.subTotalAmt = 0;
        cart.totalAmt = 0;
        await cart.save();
      }

      console.log(`IPN processed successfully for tran_id: ${tran_id}`);
    }

    return res.status(200).send("IPN Handled");

  } catch (error: any) {
    console.error("IPN Error:", error);
    return res.status(500).json({ message: "IPN processing failed" });
  }
};