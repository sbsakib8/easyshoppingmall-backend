import { Request, Response } from "express";
import SSLCommerzPayment from "sslcommerz-lts";
import processdata from "../../config";
import { AuthRequest } from "../../middlewares/isAuth"; // Import AuthRequest
import { clearUserCart } from "../../utils/cart.utils";
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
    console.log("Order object in initSslPayment:", order); // Added for debugging

    if (amount <= 0) return res.status(400).json({ message: "Invalid payable amount" });

    // Unique transaction ID
    const tranId = `${order.orderId}-${Date.now()}`;

    // SSLCommerz required data
    const sslData = {
      total_amount: String(Number(amount.toFixed(2))),
      currency: "BDT",
      tran_id: tranId,

      product_name: "Ecommerce Order",
      product_category: "Ecommerce",
      product_profile: "general",

      cus_name: req.user.name || "Customer",
      cus_email: req.user.email || "customer@test.com",
      cus_phone: String(req.user.mobile || order.address?.mobile || "01700000000"),
      cus_add1: String(order.address?.address_line || "N/A"),
      cus_city: String(order.address?.district || "N/A"),
      cus_postcode: String(order.address?.pincode || "1200"),
      cus_country: String(order.address?.country || "Bangladesh"),

      // REQUIRED SHIPPING FIELDS
      shipping_method: "YES",
      ship_name: req.user.name || "Customer",
      ship_add1: String(order.address?.address_line || "N/A"),
      ship_city: String(order.address?.district || "N/A"),
      ship_postcode: String(order.address?.pincode || "1200"),
      ship_country: String(order.address?.country || "Bangladesh"),

      success_url: `${process.env.BACKEND_URL}/payment/success`,
      fail_url: `${process.env.BACKEND_URL}/payment/fail`,
      cancel_url: `${process.env.BACKEND_URL}/payment/cancel`,
      ipn_url: `${process.env.BACKEND_URL}/payment/ipn`,
    };

    // Use correct credentials & mode
    const sslcz = new SSLCommerzPayment(
      processdata.sslcommerzstoreid,
      processdata.sslcommerzstorepassword,
      false
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
    order.payment_details = { ssl: { tran_id: tranId } };
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
      false
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
    } else {
      order.amount_paid = order.totalAmt;
      order.amount_due = 0;
    }

    await order.save();

    // Clear user's cart
    await clearUserCart(order.userId);

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
    // CRITICAL: VALIDATE THE IPN DATA WITH SSLCOMMERZ
    // =================================================================
    const sslcz = new SSLCommerzPayment(
      processdata.sslcommerzstoreid,
      processdata.sslcommerzstorepassword,
      false
    );

    const validation = await sslcz.validate(ipnData);

    if (validation?.status !== 'VALID' && validation?.status !== 'VALIDATED') {

      return res.status(200).send("IPN Handled - Validation Failed");
    }

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
      await clearUserCart(order.userId);
      console.log(`IPN processed successfully for tran_id: ${tran_id}`);
    }

    return res.status(200).send("IPN Handled");

  } catch (error: any) {
    console.error("IPN Error:", error);
    return res.status(500).json({ message: "IPN processing failed" });
  }
};