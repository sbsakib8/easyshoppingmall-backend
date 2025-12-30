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

    // Product Details
    products: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        image: { type: [String], default: [] },
        quantity: { type: Number, default: 1 },
        price: { type: Number, required: true },
        totalPrice: { type: Number, default: 0 },
        size: { type: String, default: null },
        color: { type: String, default: null },
        weight: { type: String, default: null },
      },
    ],

    // Delivery Details
    delivery_address: {
      type: String,
      required: true,
    },
    deliveryCharge: {
      type: Number,
      default: 0,
    },

    // Amount Details
    subTotalAmt: { type: Number, default: 0 },
    totalAmt: { type: Number, default: 0 },
    amount_paid: { type: Number, default: 0 },
    amount_due: { type: Number, default: 0 },

    // Payment Details
    // Payment Details
    payment_method: {
      type: String,
      enum: ["manual", "sslcommerz"],
      default: "manual",
    },
    payment_type: {
      type: String,
      enum: ["full", "delivery"],
      default: "full",
      required: true,
    },
    payment_status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    payment_details: {
      type: Schema.Types.Mixed,
      default: null,
    },
    paymentId: { type: String, default: "" },
    invoice_receipt: { type: String, default: "" },


    // Order Status
    order_status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled", "completed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// FIX PRE-HOOK TYPES
orderSchema.pre<IOrder>("save", function (next) {
  // product totals
  this.products.forEach((p) => {
    p.totalPrice = p.quantity * p.price;
  });

  next();
});


const OrderModel: Model<IOrder> = mongoose.model<IOrder>("Order", orderSchema);

export default OrderModel;
