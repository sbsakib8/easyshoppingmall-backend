import { Request, Response } from "express";
import SSLCommerzPayment from "sslcommerz-lts";
import processdata from "../../config";
import { AuthRequest } from "../../middlewares/isAuth"; // Import AuthRequest
import { CartModel } from "../cart/cart.model";
import OrderModel from "../order/order.model";

/**
 * POST /api/payment/init
 * body: { dbOrderId: string, user: { name, email, phone, address }, method: "manual" | "sslcommerz" }
 */
export const initSslPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.body;

    if (!req.userId || !req.user) {
      return res.status(401).json({ message: "Unauthorized: User not authenticated" });
    }

    const order = await OrderModel.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Calculate payable amount
    const subTotal = Number(order.subTotalAmt || 0);
    const deliveryCharge = Number(order.deliveryCharge || 0);
    const amount = order.payment_type === "delivery" ? deliveryCharge : subTotal + deliveryCharge;

    console.log("Payment Type:", order.payment_type);
    console.log("Sub Total:", subTotal);
    console.log("Delivery Charge:", deliveryCharge);
    console.log("Final Amount:", amount);

    if (amount <= 0) return res.status(400).json({ message: "Invalid payable amount" });

    // Unique transaction ID
    const tranId = `${order.orderId}-${Date.now()}`;

    // SSLCommerz required data
    const sslData = {
      total_amount: String(Number(amount.toFixed(2))), // Explicitly convert to string
      currency: "BDT",
      tran_id: tranId,

      product_name: "Ecommerce Order",
      product_category: "Ecommerce",
      product_profile: "general",

      cus_name: req.user.name || "Customer",
      cus_email: req.user.email || "customer@test.com",
      cus_phone: String(req.user.mobile || order.delivery_address.mobile || "01700000000"), // Ensure phone is string
      cus_add1: String(order.delivery_address.address_line || "N/A"), // Ensure string
      cus_city: String(order.delivery_address.district || "N/A"),     // Ensure string
      cus_postcode: String(order.delivery_address.pincode || "1200"), // Ensure string
      cus_country: String(order.delivery_address.country || "Bangladesh"), // Ensure string

      // REQUIRED SHIPPING FIELDS
      shipping_method: "YES",
      ship_name: req.user.name || "Customer",
      ship_add1: String(order.delivery_address.address_line || "N/A"), // Ensure string
      ship_city: String(order.delivery_address.district || "N/A"),     // Ensure string
      ship_postcode: String(order.delivery_address.pincode || "1200"), // Ensure string
      ship_country: String(order.delivery_address.country || "Bangladesh"), // Ensure string

      success_url: `${process.env.BACKEND_URL}/payment/success`,
      fail_url: `${process.env.BACKEND_URL}/api/payment/fail`,
      cancel_url: `${process.env.BACKEND_URL}/api/payment/cancel`,
      ipn_url: `${process.env.BACKEND_URL}/api/payment/ipn`,
    };

    // Use correct credentials & mode
    const sslcz = new SSLCommerzPayment(
      processdata.sslcommerzstoreid,
      processdata.sslcommerzstorepassword,
      false // false for live, true for sandbox
    );

    const apiResponse = await sslcz.init(sslData);
    console.log("SSLCommerz Init Response:", apiResponse);

    if (!apiResponse?.GatewayPageURL) {
      return res.status(500).json({
        success: false,
        message: apiResponse?.failedreason || "SSL payment initialization failed",
        url: "",
      });
    }

    // Save tran_id and mark payment as pending
    order.tran_id = tranId;
    order.payment_status = "pending";
    order.payment_details = { sessionKey: apiResponse.sessionkey || "" };
    await order.save();

    return res.json({ success: true, url: apiResponse.GatewayPageURL });
  } catch (error) {
    console.error("SSL init error:", error);
    return res.status(500).json({ success: false, message: "SSL payment initialization failed" });
  }
};




// SUCCESS
export const paymentSuccess = async (req: Request, res: Response) => {
  try {
    const { tran_id } = req.body;

    if (!tran_id) {
      return res.status(400).redirect(`${process.env.FRONTEND_URL}/payment/fail?error=InvalidTransactionID`);
    }

    const order = await OrderModel.findOne({ tran_id: tran_id });
    if (!order) {
      return res.status(404).redirect(`${process.env.FRONTEND_URL}/payment/fail?error=OrderNotFound`);
    }

    // =================================================================
    // 🔒 CRITICAL: VALIDATE THE PAYMENT WITH SSLCOMMERZ
    // =================================================================
    const sslcz = new SSLCommerzPayment(
      processdata.sslcommerzstoreid,
      processdata.sslcommerzstorepassword,
      false // false for live, true for sandbox
    );

    const validation = await sslcz.validate(req.body);

    if (validation?.status !== 'VALID' && validation?.status !== 'VALIDATED') {
      await OrderModel.findOneAndUpdate(
        { tran_id: tran_id },
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
        { tran_id: tran_id },
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
        { tran_id: tran_id },
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
    const sslcz = new SSLCommerzPayment(
      processdata.sslcommerzstoreid,
      processdata.sslcommerzstorepassword,
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
    const order = await OrderModel.findOne({ tran_id: tran_id });
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