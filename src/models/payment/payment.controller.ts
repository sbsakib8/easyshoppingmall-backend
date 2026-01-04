import { Request, Response } from "express";
import OrderModel from "../order/order.model"; // Corrected import path
import { PaymentModel } from "./payment.model"; // Corrected import path
import { initSslPayment } from "./ssl/ssl.service";
import { generateTranId } from "../../utils/generateTranId"; // Assuming this utility exists

export const initiatePayment = async (req: Request, res: Response) => {
  // Ensure req.userId is available from isAuth middleware
  if (!req.userId) {
    return res.status(401).json({ message: "Unauthorized: User ID not found" });
  }

  const { orderId, payment_type } = req.body;
  const userId = req.userId; // Use req.userId directly

  const order = await OrderModel.findById(orderId);
  if (!order) return res.status(404).json({ message: "Order not found" });

  const payable_amount =
    payment_type === "delivery"
      ? order.deliveryCharge
      : order.totalAmt;

  const payment = await PaymentModel.create({
    orderId,
    userId,
    provider: "sslcommerz",
    payment_type,
    payable_amount,
    tran_id: generateTranId(),
  });

  const sslResponse = await initSslPayment({
    total_amount: payable_amount,
    currency: "BDT",
    tran_id: payment.tran_id,
    success_url: `${process.env.BACKEND_URL}/api/ssl/success`,
    fail_url: `${process.env.BACKEND_URL}/api/ssl/fail`,
    cancel_url: `${process.env.BACKEND_URL}/api/ssl/cancel`,
    cus_name: req.user?.name || "Customer", // Use req.user.name with fallback
    cus_phone: req.user?.mobile || "N/A", // Use req.user.mobile with fallback
  });

  res.json({ url: sslResponse.GatewayPageURL });
};
