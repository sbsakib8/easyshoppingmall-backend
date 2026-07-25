import { Document, Types } from "mongoose";

export interface IBalanceTransaction extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  type: "courier_adjustment" | "manual_credit" | "manual_deduct" | "order_payment" | "profit" | "referral_bonus" | "withdrawal" | "cod_return_deduction";
  reason: string;
  orderId?: Types.ObjectId;
  performedBy?: Types.ObjectId;
  balanceAfter: number;
  createdAt: Date;
}
