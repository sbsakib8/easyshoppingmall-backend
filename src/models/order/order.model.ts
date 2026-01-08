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
    cart: {
      type: Schema.Types.ObjectId,
      ref: "Cart",
      required: true,
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
    address: {
      address_line: { type: String, required: true },
      district: { type: String, default: "" },
      division: { type: String, default: "" },
      upazila_thana: { type: String, default: "" },
      pincode: { type: String, default: "" },
      country: { type: String, default: "" },
      mobile: { type: Number, default: null },
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
      enum: ["full", "advance", "delivery"],
      default: "full",
      required: true,
    },
    payment_status: {
      type: String,
      enum: ["pending", "submitted", "paid", "failed", "refunded"],
      default: "pending",
    },
    payment_details: {
      manual: {
        provider: { type: String },
        senderNumber: { type: String }, // Renamed from providerNumber
        transactionId: { type: String },
        paidFor: { type: String, enum: ["full"] },
      },
      ssl: {
        tran_id: { type: String },
        val_id: { type: String },
      },
    },
    paymentId: { type: String, default: "" },
    tran_id: { type: String, index: true },
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
  let subTotal = 0;

  this.products.forEach((p) => {
    const quantity = Number(p.quantity) || 0;
    const price = Number(p.price) || 0;
    p.totalPrice = quantity * price;
    subTotal += p.totalPrice;
  });

  this.subTotalAmt = subTotal;
  this.totalAmt = subTotal + (Number(this.deliveryCharge) || 0);

    if (
    this.payment_method === "manual" &&
    this.payment_details &&
    this.payment_details.manual // Check if manual property exists on payment_details
  ) {
    const manualDetails = this.payment_details.manual;

    // Only validate if any of the manual payment details are actually provided
    if (manualDetails.senderNumber !== undefined || manualDetails.transactionId !== undefined) {
      if (!manualDetails.senderNumber || !manualDetails.transactionId) {
        return next(
          new Error(
            "Sender number and transaction ID are required for manual payment when details are provided."
          )
        );
      }
    }
  }

  next();
});

const OrderModel: Model<IOrder> = mongoose.model<IOrder>("Order", orderSchema);

export default OrderModel;
