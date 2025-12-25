import { Request, Response } from "express";
import SSLCommerzPayment from "sslcommerz-lts";
import OrderModel from "../order/order.model";

/**
 * POST /api/payment/init
 * body: { dbOrderId: string, user: { name, email, phone, address }, method: "manual" | "sslcommerz" }
 */
export const initPayment = async (req: Request, res: Response) => {
  try {
    const { dbOrderId, user, method } = req.body;

    if (!dbOrderId) {
      return res.status(400).json({ message: "dbOrderId (order _id) is required" });
    }

    const order = await OrderModel.findById(dbOrderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // If manual payment → no SSL needed
    if (method === "manual") {
      order.payment_method = "manual";
      order.payment_status = "pending";
      await order.save();

      return res.status(200).json({
        message: "Manual payment selected",
        orderId: order.orderId,
      });
    }

    // SSLCommerz payment process
    order.payment_method = "sslcommerz";

    const totalAmount = Number(order.totalAmt) || 1;

    const store_id = "easys690b843505473";
    const store_passwd = "easys690b843505473@ssl";
    const is_live = false;

    const FRONTEND_URL = process.env.FRONTEND_URL;
    const BACKEND_URL = process.env.BACKEND_URL;

    const data = {
      total_amount: totalAmount,
      currency: "BDT",
      tran_id: order.orderId,

      success_url: `${BACKEND_URL}/payment/success`,
      fail_url: `${BACKEND_URL}/payment/fail`,
      cancel_url: `${BACKEND_URL}/payment/cancel`,

      ipn_url: `${BACKEND_URL}/api/payment/ipn`,

      product_name: "Order Checkout",
      product_category: "Ecommerce",
      product_profile: "general",

      cus_name: user?.name || "Easy Shopping Mall Customer",
      cus_email: user?.email || "no-reply@local",
      cus_phone: user?.phone || "0000000000",
      cus_add1: user?.address || "",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",

      ship_name: user?.name || "Easy Shopping Mall Customer",
      ship_add1: user?.address || "",
      ship_city: "Dhaka",
      ship_country: "Bangladesh",
      ship_postcode: "1207",

      shipping_method: "YES",
    };

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const apiResponse = await sslcz.init(data);

    if (apiResponse?.GatewayPageURL) {
      order.payment_details = { sessionKey: apiResponse.sessionkey || "" };
      await order.save();

      return res.status(200).json({
        message: "Payment session created",
        url: apiResponse.GatewayPageURL,
      });
    } else {
      return res.status(400).json({
        message: "Failed to create payment session",
        details: apiResponse,
      });
    }
  } catch (error: any) {
    console.error("initPayment error:", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error",
    });
  }
};

// SUCCESS
export const paymentSuccess = async (req: Request, res: Response) => {
  try {
    const tran_id = req.body?.tran_id;

    if (!tran_id) return res.status(400).send("tran_id missing");

    await OrderModel.findOneAndUpdate(
      { orderId: tran_id },
      { payment_status: "paid", order_status: "processing" }
    );

    return res.redirect(`${process.env.FRONTEND_URL}/payment/success?tranId=${tran_id}`);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// FAIL
export const paymentFail = async (req: Request, res: Response) => {
  try {
    const tran_id = req.body?.tran_id;

    if (tran_id) {
      await OrderModel.findOneAndUpdate(
        { orderId: tran_id },
        { payment_status: "failed", order_status: "cancelled" }
      );
    }

    return res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// CANCEL
export const paymentCancel = async (req: Request, res: Response) => {
  try {
    const tran_id = req.body?.tran_id;

    if (tran_id) {
      await OrderModel.findOneAndUpdate(
        { orderId: tran_id },
        { payment_status: "failed", order_status: "cancelled" }
      );
    }

    return res.redirect(`${process.env.FRONTEND_URL}/payment/cancel`);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// IPN
export const paymentIpn = async (req: Request, res: Response) => {
  try {
    const tran_id = req.body?.tran_id;
    const status = req.body?.status;

    const order = await OrderModel.findOne({ orderId: tran_id });
    if (!order) return res.status(404).send("Order not found");

    if (status === "VALID" || status === "VALIDATED") {
      order.payment_status = "paid";
      order.order_status = "processing";
    } else {
      order.payment_status = "failed";
      order.order_status = "cancelled";
    }

    await order.save();

    return res.status(200).send("IPN processed");
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
