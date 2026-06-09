"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentModel = void 0;
const mongoose_1 = require("mongoose");
const paymentSchema = new mongoose_1.Schema({
    orderId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
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
    gateway_response: { type: mongoose_1.Schema.Types.Mixed },
}, { timestamps: true });
exports.PaymentModel = (0, mongoose_1.model)("Payment", paymentSchema);
