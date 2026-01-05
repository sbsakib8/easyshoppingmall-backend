import { Schema, model } from "mongoose";
import { IPayment } from "./payment.interface";

const paymentSchema = new Schema<IPayment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    provider: { type: String, enum: ["sslcommerz", "manual"], required: true },
    payment_type: { type: String, enum: ["full", "delivery"], required: true },

    payable_amount: { type: Number, required: true },
    paid_amount: { type: Number, default: 0 },

    currency: { type: String, default: "BDT" },
    status: {
      type: String,
      enum: ["initiated", "paid", "failed"],
      default: "initiated",
    },

    tran_id: { type: String, unique: true, required: true },
    gateway_response: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const PaymentModel = model<IPayment>("Payment", paymentSchema);
