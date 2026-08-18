import mongoose, { Document, Schema, Types } from "mongoose";

export interface IVideoAccess extends Document {
    userId: Types.ObjectId;
    courseId?: Types.ObjectId | null;
    amount: number;
    paymentMethod: string;
    transactionId: string;
    senderNumber: string;
    status: "pending" | "approved" | "rejected";
    videoType: string; // e.g., 'paid_training'
    adminNote?: string;
    referredBy?: Types.ObjectId | null;
    referralBonusCredited?: boolean; // tracks if the referral bonus was actually credited to referrer
    createdAt: Date;
    updatedAt: Date;
}

const videoAccessSchema = new Schema<IVideoAccess>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        courseId: {
            type: Schema.Types.ObjectId,
            ref: "VideoCourse",
            default: null,
        },
        amount: {
            type: Number,
            required: true,
        },
        paymentMethod: {
            type: String,
            required: true,
        },
        transactionId: {
            type: String,
            required: true,
            unique: true,
        },
        senderNumber: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        videoType: {
            type: String,
            required: true,
            default: "paid_training",
        },
        adminNote: {
            type: String,
            default: "",
        },
        referredBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        referralBonusCredited: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const VideoAccessModel = mongoose.model<IVideoAccess>("VideoAccess", videoAccessSchema);

export default VideoAccessModel;
