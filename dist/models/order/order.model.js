"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const orderSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    orderId: {
        type: String,
        required: true,
        unique: true,
    },
    cart: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Cart",
        required: true,
    },
    // Product Details
    products: [
        {
            productId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product", required: true },
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
        enum: ["full", "delivery"],
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
    tran_id: { type: String, index: true, unique: true },
    invoice_receipt: { type: String, default: "" },
    // Order Status
    order_status: {
        type: String,
        enum: ["pending", "processing", "shipped", "delivered", "cancelled", "completed"],
        default: "pending",
    },
}, { timestamps: true });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ userId: 1, createdAt: -1 });
// FIX PRE-HOOK TYPES
orderSchema.pre("save", function (next) {
    let subTotal = 0;
    this.products.forEach((p) => {
        const quantity = Number(p.quantity) || 0;
        const price = Number(p.price) || 0;
        p.totalPrice = quantity * price;
        subTotal += p.totalPrice;
    });
    this.subTotalAmt = subTotal;
    this.totalAmt = subTotal + (Number(this.deliveryCharge) || 0);
    // Payment amount calculation
    if (this.payment_method === "manual") {
        if (this.payment_type === "full") {
            this.amount_paid = this.totalAmt;
            this.amount_due = 0;
        }
        if (this.payment_type === "delivery") {
            this.amount_paid = Number(this.deliveryCharge) || 0;
            this.amount_due = this.totalAmt - this.amount_paid;
        }
    }
    if (this.payment_method === "manual" &&
        this.payment_details &&
        this.payment_details.manual // Check if manual property exists on payment_details
    ) {
        const manualDetails = this.payment_details.manual;
        // Only validate if any of the manual payment details are actually provided
        if (manualDetails.senderNumber !== undefined || manualDetails.transactionId !== undefined) {
            if (!manualDetails.senderNumber || !manualDetails.transactionId) {
                return next(new Error("Sender number and transaction ID are required for manual payment when details are provided."));
            }
        }
    }
    next();
});
const OrderModel = mongoose_1.default.model("Order", orderSchema);
exports.default = OrderModel;
