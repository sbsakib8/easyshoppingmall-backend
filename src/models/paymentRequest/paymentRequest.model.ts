import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPaymentRequest extends Document {
    userId: Types.ObjectId;
    amount: number;
    paymentMethod: string;
    number: string;
    status: "pending" | "approved" | "rejected";
    transactionId?: string; // Provided by admin on approval
    senderNumber?: string;  // The number admin used to send money
    screenshot?: string;    // Provided by admin on approval
    adminNote?: string;
    createdAt: Date;
    updatedAt: Date;
}

const paymentRequestSchema = new Schema<IPaymentRequest>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        paymentMethod: {
            type: String,
            required: true,
        },
        number: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        transactionId: {
            type: String,
            default: null,
        },
        senderNumber: {
            type: String,
            default: null,
        },
        screenshot: {
            type: String,
            default: null,
        },
        adminNote: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

const PaymentRequestModel = mongoose.model<IPaymentRequest>("PaymentRequest", paymentRequestSchema);

// Self-healing: Attempt to drop the stuck unique index if it exists
PaymentRequestModel.collection.dropIndex("transactionId_1").catch(() => {
    // Index doesn't exist or already dropped, ignore error
});

export default PaymentRequestModel;
