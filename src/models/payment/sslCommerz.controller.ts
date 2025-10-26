import { Request, Response } from "express";
import SSLCommerzPayment from "sslcommerz-lts";
import OrderModel from "../order/order.model";
import { sslConfig } from "../../config/sslcommerze";
import { IOrder } from "../order/interface";

// 🧾 Initialize Payment
export const initPayment = async (req: Request, res: Response) => {
  try {
    const { orderId, user } = req.body;

    const order = await OrderModel.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const data = {
      total_amount: order.totalAmt,
      currency: "BDT",
      tran_id: order.orderId, // Must be unique
      success_url: `${process.env.BACKEND_URL}/api/payment/success`,
      fail_url: `${process.env.BACKEND_URL}/api/payment/fail`,
      cancel_url: `${process.env.BACKEND_URL}/api/payment/cancel`,
      ipn_url: `${process.env.BACKEND_URL}/api/payment/ipn`,
      shipping_method: "Courier",
      product_name: "Ekomart Checkout",
      product_category: "Ecommerce",
      product_profile: "general",
      cus_name: user.name,
      cus_email: user.email,
      cus_phone: user.phone,
      cus_add1: user.address,
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      ship_name: user.name,
      ship_add1: user.address,
      ship_city: "Dhaka",
      ship_country: "Bangladesh",
    };

    const sslcz = new SSLCommerzPayment(
      sslConfig.store_id,
      sslConfig.store_passwd,
      sslConfig.is_live
    );

    const apiResponse = await sslcz.init(data);

    if (apiResponse?.GatewayPageURL) {
      // Optionally save session key for later verification
      (order as any).payment_session_key = apiResponse.sessionkey;
      await order.save();

      return res.status(200).json({
        message: "Payment session created successfully",
        url: apiResponse.GatewayPageURL,
      });
    } else {
      return res.status(400).json({ message: "Failed to create payment session" });
    }
  } catch (error: any) {
    console.error("initPayment Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ✅ SUCCESS
export const paymentSuccess = async (req: Request, res: Response) => {
  try {
    const { tran_id } = req.body;

    await OrderModel.findOneAndUpdate(
      { orderId: tran_id },
      {
        payment_status: "paid",
        order_status: "processing",
      }
    );

    return res.redirect(`${process.env.FRONTEND_URL}/payment/success?tranId=${tran_id}`);
  } catch (error: any) {
    console.error("paymentSuccess Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ❌ FAIL
export const paymentFail = async (req: Request, res: Response) => {
  try {
    const { tran_id } = req.body;

    await OrderModel.findOneAndUpdate(
      { orderId: tran_id },
      {
        payment_status: "failed",
        order_status: "cancelled",
      }
    );

    return res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);
  } catch (error: any) {
    console.error("paymentFail Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🚫 CANCEL
export const paymentCancel = async (req: Request, res: Response) => {
  try {
    const { tran_id } = req.body;

    await OrderModel.findOneAndUpdate(
      { orderId: tran_id },
      {
        payment_status: "failed",
        order_status: "cancelled",
      }
    );

    return res.redirect(`${process.env.FRONTEND_URL}/payment/cancel`);
  } catch (error: any) {
    console.error("paymentCancel Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 📩 IPN — Instant Payment Notification (for async verification)
export const paymentIpn = async (req: Request, res: Response) => {
  try {
    const { tran_id, status } = req.body;
    console.log("SSLCommerz IPN received:", req.body);

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
    return res.status(200).send("IPN received successfully");
  } catch (error: any) {
    console.error("paymentIpn Error:", error);
    return res.status(500).json({ message: error.message });
  }
};
