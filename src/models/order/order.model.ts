import mongoose, { Model, Schema } from "mongoose";
import { calculateDeliveryCharge } from "../../utils/deliveryCharge";
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
    deliveryCharge: {
      type: Number,
      required: true,
      default: 0,
    },


    products: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        image: { type: [String], default: [] },
        quantity: { type: Number, default: 1 },
        price: { type: Number, required: true },
        totalPrice: { type: Number, default: 0 },
        size: String,
        color: { type: String, default: null },
        weight: { type: String, default: null },

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
      enum: ["manual", "sslcommerz", "online"],
      default: "manual",
    },

    // ⭐ NEW FIELD
    payment_session_key: {
      type: String,
      default: "",
    },
    payment_details: {
      providerNumber: { type: String },
      transactionId: { type: String },
      manualFor: { type: String },
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
  const order = this as any;

  // product totals
  order.products.forEach((p) => {
    p.totalPrice = p.quantity * p.price;
  });

  // subtotal
  order.subTotalAmt = order.products.reduce(
    (sum, p) => sum + p.totalPrice,
    0
  );

  // delivery charge from address
  const district = order.delivery_address;
  order.deliveryCharge = calculateDeliveryCharge(district);

  // final total
  order.totalAmt = order.subTotalAmt + order.deliveryCharge;

  next();
});


const OrderModel: Model<IOrder> = mongoose.model<IOrder>("Order", orderSchema);

export default OrderModel;
