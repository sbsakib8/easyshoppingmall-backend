import mongoose, { Document,  } from "mongoose";
// 1. Interface
export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId | string;
  orderId: string;
  products: {
    productId: mongoose.Types.ObjectId | string;
    name: string;
    image: string[];
    quantity: number;
    price: number;
    totalPrice: number;
  }[];
  paymentId?: string;
  payment_status?: "pending" | "paid" | "failed" | "refunded";
  delivery_address: mongoose.Types.ObjectId | string;
  subTotalAmt: number;
  totalAmt: number;
  invoice_receipt?: string;
  order_status?: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt?: Date;
  updatedAt?: Date;
}