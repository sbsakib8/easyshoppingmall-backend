import mongoose, { Types } from "mongoose";

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

// Main Order Interface
export interface IOrder {
  _id: Types.ObjectId;
  orderId: string;
  userId: Types.ObjectId;
  cart: Types.ObjectId;
  products: {
    productId: Types.ObjectId;
    name: string;
    image: string[];
    quantity: number;
    price: number;
    totalPrice: number;
    size?: string;
    color?: string;
    weight?: string;
  }[];
  subTotalAmt: number;
  totalAmt: number;
  amount_paid?: number;
  amount_due?: number;
  deliveryCharge: number;
  payment_method: string;
  payment_type: "full" | "delivery";
  payment_status: "pending" | "submitted" | "paid" | "failed" | "refunded";
  payment_details: {
    manual?: {
      provider?: string;
      senderNumber?: string; // Renamed from providerNumber
      transactionId?: string;
      paidFor?: "full" | "delivery";
    };
    ssl?: {
      tran_id?: string;
      val_id?: string;
    };
  } | null;
  paymentId?: string;
  invoice_receipt?: string;
  tran_id?: string;
  address: {
    address_line: string;
    district: string;
    division: string;
    upazila_thana: string;
    pincode: string;
    country: string;
    mobile: number;
  };
  order_status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser {
  _id: string;
  name?: string;
  email?: string;
  role?: "user" | "admin";
  mobile?: string;
}