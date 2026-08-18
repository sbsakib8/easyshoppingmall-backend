import mongoose, { Schema, Model } from "mongoose";
import { IBalanceTransaction } from "./interface";

const balanceTransactionSchema = new Schema<IBalanceTransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "courier_adjustment",
        "manual_credit",
        "manual_deduct",
        "order_payment",
        "profit",
        "referral_bonus",
        "withdrawal",
        "cod_return_deduction",
      ],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

balanceTransactionSchema.index({ userId: 1, createdAt: -1 });
balanceTransactionSchema.index({ type: 1 });
balanceTransactionSchema.index({ createdAt: -1 });

const BalanceTransactionModel: Model<IBalanceTransaction> =
  mongoose.model<IBalanceTransaction>(
    "BalanceTransaction",
    balanceTransactionSchema
  );

export default BalanceTransactionModel;
