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
        type: mongoose_1.Schema.Types.Mixed,
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
}, { timestamps: true });
// FIX PRE-HOOK TYPES
orderSchema.pre("save", function (next) {
    // product totals
    this.products.forEach((p) => {
        p.totalPrice = p.quantity * p.price;
    });
    next();
});
const OrderModel = mongoose_1.default.model("Order", orderSchema);
exports.default = OrderModel;
