// src/payment/payment.controllers.ts
import { Request, Response } from "express";
import SSLCommerzPayment from "sslcommerz-lts";
import { sslConfig } from "../../config/sslcommerze";
import OrderModel from "../order/order.model";

/**
 * POST /api/payment/init
 * body: { dbOrderId: string, user: { name, email, phone, address } }
 */
export const initPayment = async (req: Request, res: Response) => {
  try {
    const { dbOrderId, user } = req.body;
    if (!dbOrderId) return res.status(400).json({ message: "dbOrderId (order _id) is required" });

    const order = await OrderModel.findById(dbOrderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // prepare payload: use order.orderId (UUID) as tran_id
    const data = {
      total_amount: order.totalAmt,
      currency: "BDT",
      tran_id: order.orderId, // UNIQUE identifier for gateway
      success_url: `${process.env.BACKEND_URL}/api/payment/success`,
      fail_url: `${process.env.BACKEND_URL}/api/payment/fail`,
      cancel_url: `${process.env.BACKEND_URL}/api/payment/cancel`,
      ipn_url: `${process.env.BACKEND_URL}/api/payment/ipn`,
      shipping_method: "Courier",
      product_name: "Order Checkout",
      product_category: "Ecommerce",
      product_profile: "general",
      cus_name: user?.name || "Guest",
      cus_email: user?.email || "no-reply@local",
      cus_phone: user?.phone || "0000000000",
      cus_add1: user?.address || "",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      ship_name: user?.name || "Guest",
      ship_add1: user?.address || "",
      ship_city: "Dhaka",
      ship_country: "Bangladesh",
    };

    const sslcz = new SSLCommerzPayment(sslConfig.store_id, sslConfig.store_passwd, sslConfig.is_live);
    const apiResponse = await sslcz.init(data);

    if (apiResponse?.GatewayPageURL) {
      order.payment_session_key = apiResponse.sessionkey;
      await order.save();

      return res.status(200).json({ message: "Payment session created", url: apiResponse.GatewayPageURL });
    } else {
      return res.status(400).json({ message: "Failed to create payment session" });
    }
  } catch (error: any) {
    console.error("initPayment error:", error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

/**
 * SSLCommerz will POST form-data to these endpoints.
 * Ensure express.urlencoded({ extended: true }) is enabled.
 */

// success
export const paymentSuccess = async (req: Request, res: Response) => {
  try {
    // SSLCommerz sends tran_id in form body
    const tran_id = req.body?.tran_id || req.body?.value_a || null;
    if (!tran_id) {
      console.warn("paymentSuccess: tran_id missing", req.body);
      return res.status(400).send("tran_id missing");
    }

    await OrderModel.findOneAndUpdate({ orderId: tran_id }, { payment_status: "paid", order_status: "processing" });

    // redirect to frontend success page (you can pass tran_id)
    return res.redirect(`${process.env.FRONTEND_URL}/payment/success?tranId=${tran_id}`);
  } catch (error: any) {
    console.error("paymentSuccess error:", error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// fail
export const paymentFail = async (req: Request, res: Response) => {
  try {
    const tran_id = req.body?.tran_id || null;
    if (tran_id) {
      await OrderModel.findOneAndUpdate({ orderId: tran_id }, { payment_status: "failed", order_status: "cancelled" });
    }
    return res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);
  } catch (error: any) {
    console.error("paymentFail error:", error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// cancel
export const paymentCancel = async (req: Request, res: Response) => {
  try {
    const tran_id = req.body?.tran_id || null;
    if (tran_id) {
      await OrderModel.findOneAndUpdate({ orderId: tran_id }, { payment_status: "failed", order_status: "cancelled" });
    }
    return res.redirect(`${process.env.FRONTEND_URL}/payment/cancel`);
  } catch (error: any) {
    console.error("paymentCancel error:", error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// IPN (instant payment notification) — asynchronous server-to-server callback
export const paymentIpn = async (req: Request, res: Response) => {
  try {
    const tran_id = req.body?.tran_id;
    const status = req.body?.status || req.body?.status_code || null;
    console.log("IPN received", req.body);

    const order = await OrderModel.findOne({ orderId: tran_id });
    if (!order) return res.status(404).send("Order not found");

    if (status === "VALID" || status === "VALIDATED" || status === "200") {
      order.payment_status = "paid";
      order.order_status = "processing";
    } else {
      order.payment_status = "failed";
      order.order_status = "cancelled";
    }

    await order.save();
    return res.status(200).send("IPN processed");
  } catch (error: any) {
    console.error("paymentIpn error:", error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};
