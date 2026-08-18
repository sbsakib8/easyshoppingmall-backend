import { Request, Response } from "express";
import OrderModel from "../order/order.model"; // Corrected import path
import { PaymentModel } from "../payment/payment.model";

export const getAllPayments = async (_req: Request, res: Response) => {
  const payments = await PaymentModel.find()
    .populate("orderId")
    .populate("userId");

  res.json(payments);
};

export const getAllOrders = async (_req: Request, res: Response) => {
  const orders = await OrderModel.find()
    .populate("userId")
    .populate("products.productId")
  res.json(orders);
};

export const getOrderPayments = async (req: Request, res: Response) => {
  const payments = await PaymentModel.find({
    orderId: req.params.orderId,
  });

  res.json(payments);
};
