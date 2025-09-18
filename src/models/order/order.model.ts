import mongoose, { Document, Schema, Model } from "mongoose";
import { IOrder } from "./interface";



// 2. Schema
const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: String,
      required: [true, "Provide orderId"],
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
      },
    ],
    paymentId: {
      type: String,
      default: "",
    },
    payment_status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    delivery_address: {
      type: Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    subTotalAmt: {
      type: Number,
      default: 0,
    },
    totalAmt: {
      type: Number,
      default: 0,
    },
    invoice_receipt: {
      type: String,
      default: "",
    },
    order_status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.pre("save", function (next) {
  if (this.products && this.products.length > 0) {
    this.products.forEach((p) => {
      p.totalPrice = p.quantity * p.price;
    });
    this.subTotalAmt = this.products.reduce((sum, p) => sum + p.totalPrice, 0);
    this.totalAmt = this.subTotalAmt; 
  }
  next();
});

// 4. Model type
const OrderModel: Model<IOrder> = mongoose.model<IOrder>("Order", orderSchema);

export default OrderModel;
