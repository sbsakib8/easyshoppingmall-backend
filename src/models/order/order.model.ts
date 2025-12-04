import mongoose, { Model, Schema } from "mongoose";
import { IOrder } from "./interface";

const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    orderId: {
      type: String,
      required: true,
      unique: true,
    },

    products: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        image: { type: [String], default: [] },
        quantity: { type: Number, default: 1 },
        price: { type: Number, required: true },
        totalPrice: { type: Number, default: 0 },
        selectedColor: { type: String },
        selectedSize: { type: String },
        selectedWeight: { type: String },
      },
    ],

    paymentId: { type: String, default: "" },

    payment_status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    // ⭐ NEW FIELD
    payment_method: {
      type: String,
      enum: ["manual", "sslcommerz"],
      default: "manual",
    },

    // ⭐ NEW FIELD
    payment_session_key: {
      type: String,
      default: "",
    },

    delivery_address: {
      type: String,
      required: true,
    },

    subTotalAmt: { type: Number, default: 0 },
    totalAmt: { type: Number, default: 0 },

    invoice_receipt: { type: String, default: "" },

    order_status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled", "completed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// FIX PRE-HOOK TYPES
orderSchema.pre("save", function (next) {
  const self = this as unknown as IOrder;

  if (self.products && self.products.length > 0) {
    self.products.forEach((p) => {
      p.totalPrice = p.quantity * p.price;
    });

    self.subTotalAmt = self.products.reduce((sum, p) => sum + p.totalPrice, 0);
    self.totalAmt = self.subTotalAmt;
  }

  next();
});


const OrderModel: Model<IOrder> = mongoose.model<IOrder>("Order", orderSchema);

export default OrderModel;
