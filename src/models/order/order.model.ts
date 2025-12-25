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
    payment_method: {
      type: String,
      enum: ["manual", "sslcommerz"],
      default: "manual",
    },
    payment_type: {
      type: String,
      enum: ["full", "delivery"],
      default: "full",
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
orderSchema.pre("save", function (next) {
  const order = this as any;

  // product totals
  order.products.forEach((p: any) => {
    p.totalPrice = p.quantity * p.price;
  });

  // subtotal
  order.subTotalAmt = order.products.reduce(
    (sum: number, p: any) => sum + p.totalPrice,
    0
  );

  // delivery charge from address
  const district = order.delivery_address;
  order.deliveryCharge = calculateDeliveryCharge(district);

  // final total
  order.totalAmt = order.subTotalAmt + order.deliveryCharge;

  // Calculate amount_paid and amount_due based on payment_status and payment_type
  if (order.payment_status === "paid") {
    if (order.payment_type === "delivery") {
      // Only delivery charge is paid, products payment is due
      order.amount_paid = order.deliveryCharge;
      order.amount_due = order.subTotalAmt;
    } else {
      // Full amount is paid
      order.amount_paid = order.totalAmt;
      order.amount_due = 0;
    }
  } else {
    // Nothing paid yet
    order.amount_paid = 0;
    order.amount_due = order.totalAmt;
  }

  next();
});


const OrderModel: Model<IOrder> = mongoose.model<IOrder>("Order", orderSchema);

export default OrderModel;
