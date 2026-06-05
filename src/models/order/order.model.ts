import mongoose, { Document, Model, Schema } from "mongoose";
import { IOrder } from "./interface";
import { validateAndCalculateDiscount } from "../coupon/coupon.service";

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
      required: false,
    },

    // Product Details
    products: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        image: { type: [String], default: [] },
        quantity: { type: Number, default: 1 },
        price: { type: Number, required: true },          // cost price
        costPrice: { type: Number, default: 0 },          // explicit cost price (DS)
        sellingPrice: { type: Number, default: 0 },       // DS selling price
        totalPrice: { type: Number, default: 0 },
        size: { type: String, default: null },
        color: { type: String, default: null },
        weight: { type: String, default: null },
      },
    ],

    // Delivery Details
    address: {
      customer_name: { type: String, default: "" },
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
      enum: ["manual", "sslcommerz", "balance", "cod"],
      default: "manual",
    },
    payment_type: {
      type: String,
      enum: ["full", "delivery", "cod"],
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
        senderNumber: { type: String },
        transactionId: {
          type: String,
          unique: true,
          sparse: true,
          index: true,
        },
        paidFor: { type: String, enum: ["full", "delivery"] },
      },
      ssl: {
        tran_id: { type: String },
        val_id: { type: String },
      },
    },
    paymentId: { type: String, default: "" },
    tran_id: { type: String, default: undefined, unique: true, sparse: true },
    invoice_receipt: { type: String, default: "" },

    appliedCoupon: { type: String, default: null },
    couponDiscount: { type: Number, default: 0 },

    // Order Status
    order_status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled", "completed"],
      default: "pending",
    },
    referralBonusGiven: {
      type: Boolean,
      default: false,
    },
    referralBonusAmount: {
      type: Number,
      default: 0,
    },
    referralPercentage: {
      type: Number,
      default: 0,
    },
    referralBonusPerProduct: {
      type: Number,
      default: 0,
    },
    profitPerProduct: {
      type: Number,
      default: 0,
    },

    profitGiven: {
      type: Boolean,
      default: false,
    },
    profitAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ userId: 1, createdAt: -1 });

// FIX PRE-HOOK TYPES
orderSchema.pre<IOrder & Document>("save", async function (next) {
  let subTotal = 0;

  this.products.forEach((p) => {
    const quantity = Number(p.quantity) || 0;
    const cost = Number(p.price) || 0;
    const selling = Number(p.sellingPrice && p.sellingPrice > 0 ? p.sellingPrice : p.price) || 0;
    
    p.totalPrice = quantity * selling; // This is what the CUSTOMER pays
    subTotal += p.totalPrice;
  });

  this.subTotalAmt = subTotal;

  // Re-validate and recalculate coupon discount if applied (Bug 32)
  if (this.appliedCoupon) {
    try {
      const isDropshipper = this.products.some(p => p.sellingPrice && p.sellingPrice > 0 && p.sellingPrice !== (p.costPrice || p.price));
      const formattedItems = this.products.map(p => ({
        productId: p.productId.toString(),
        quantity: Number(p.quantity) || 0,
        price: isDropshipper ? Number(p.costPrice || p.price) || 0 : Number(p.sellingPrice || p.price) || 0,
      }));

      const { discountAmount } = await validateAndCalculateDiscount({
        code: this.appliedCoupon,
        cartItems: formattedItems,
        userId: this.userId.toString(),
        isNew: this.isNew
      });

      this.couponDiscount = discountAmount;
    } catch (err: any) {
      if (this.isNew) {
        return next(err);
      }
      console.warn(`Coupon validation failed during save of existing order ${this.orderId}: ${err.message}`);
    }
  } else {
    this.couponDiscount = 0;
  }

  this.totalAmt = subTotal + (Number(this.deliveryCharge) || 0) - (Number(this.couponDiscount) || 0);
  if (this.totalAmt < 0) this.totalAmt = 0;

  // Payment amount calculation
  if (this.payment_status === "paid" || this.order_status === "completed" || this.order_status === "delivered") {
    if (this.payment_type === "delivery") {
      const existingPaid = Number(this.amount_paid) || 0;
      if (existingPaid >= this.totalAmt) {
        this.amount_paid = this.totalAmt;
        this.amount_due = 0;
      } else {
        this.amount_paid = Number(this.deliveryCharge) || 0;
        this.amount_due = this.totalAmt - this.amount_paid;
      }
    } else {
      this.amount_paid = this.totalAmt;
      this.amount_due = 0;
    }
    this.payment_status = "paid";
  } else {
    if (this.payment_type === "full") {
      this.amount_paid = this.totalAmt;
      this.amount_due = 0;
    }

    if (this.payment_type === "delivery") {
      this.amount_paid = Number(this.deliveryCharge) || 0;
      this.amount_due = this.totalAmt - this.amount_paid;
    }

    if (this.payment_method === "cod" || this.payment_type === "cod") {
      this.amount_paid = 0;
      this.amount_due = this.totalAmt;
    }
  }
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
