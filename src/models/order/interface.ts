import mongoose, { Document } from "mongoose";

// Order Product Interface
export interface IOrderProduct {
  productId: mongoose.Types.ObjectId | string;
  name: string;
  image: string[];
  quantity: number;
  price: number;
  totalPrice: number;
  size?: string;
  color?: string;
  weight?: string;
}

// Payment Details for Manual Payment
export interface IManualPaymentDetails {
  manualFor: "full" | "delivery";
  providerNumber?: string;
  transactionId?: string;
}

// Payment Details for SSL Commerz
export interface ISSLPaymentDetails {
  sessionKey: string;
  paymentId?: string;
}

// Main Order Interface
export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId | string;
  orderId: string;
  products: IOrderProduct[];
  delivery_address: string;
  deliveryCharge: number;
  subTotalAmt: number;
  totalAmt: number;
  amount_paid?: number;
  amount_due?: number;
  // Payment Fields
  payment_method: "manual" | "sslcommerz";
  payment_type: "full" | "delivery";
  payment_status: "pending" | "paid" | "failed" | "refunded" | "partial";
  payment_details?: IManualPaymentDetails | ISSLPaymentDetails;
  paymentId?: string;
  invoice_receipt?: string;
  // Order Status
  order_status: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "completed";
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthUser {
  _id: string;
  name?: string;
  email?: string;
  role?: "user" | "admin";
  mobile?: string;
}