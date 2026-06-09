import mongoose, { Types } from "mongoose";

// Order Product Interface
export interface IOrderProduct {
  productId: mongoose.Types.ObjectId | string;
  name: string;
  image: string[];
  quantity: number;
  price: number;          // cost price
  costPrice?: number;     // explicit cost price (DS)
  sellingPrice?: number;  // DS selling price
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
    costPrice?: number;
    sellingPrice?: number;
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
  payment_type: "full" | "delivery" | "cod";
  payment_status: "pending" | "submitted" | "paid" | "failed" | "refunded";
  payment_details: {
    manual?: {
      provider?: string;
      senderNumber?: string; // Renamed from providerNumber
      transactionId?: string;
      paidFor?: "full" | "delivery" | "cod";
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
    customer_name?: string;
    address_line: string;
    district: string;
    division: string;
    upazila_thana: string;
    pincode: string;
    country: string;
    mobile: number;
  };
  appliedCoupon?: string;
  couponDiscount?: number;
  order_status: string;
  referralBonusGiven?: boolean;
  referralBonusAmount?: number;
  referralPercentage?: number;
  referralBonusPerProduct?: number;
  profitPerProduct?: number;
  profitGiven?: boolean;
  profitAmount?: number;

  // Set when admin marks a COD dropshipping order as "return"
  // (customer rejected / did not pay delivery charge).
  // Used to deduct deliveryCharge from the dropshipper's balance.
  deliveryChargeDeducted?: boolean;
  deliveryChargeDeductedAt?: Date | null;
  deliveryChargeDeductedAmount?: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  roles?: string[];
  mobile?: string;
  balance?: number;
}