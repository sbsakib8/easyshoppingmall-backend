import mongoose, { Document, Schema, Types } from "mongoose";

export interface IVideoRequest extends Document {
    userId: Types.ObjectId;
    productId: Types.ObjectId;
    videoType: "facebook_ad" | "tiktok_video" | "youtube_short" | "unboxing" | "other";
    notes: string;
    status: "pending" | "approved" | "completed" | "rejected";
    deliveredVideoUrl?: string;
    adminNote?: string;
    createdAt: Date;
    updatedAt: Date;
}

const videoRequestSchema = new Schema<IVideoRequest>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        videoType: {
            type: String,
            enum: ["facebook_ad", "tiktok_video", "youtube_short", "unboxing", "other"],
            required: true,
            default: "facebook_ad",
        },
        notes: {
            type: String,
            default: "",
        },
        status: {
            type: String,
            enum: ["pending", "approved", "completed", "rejected"],
            default: "pending",
        },
        deliveredVideoUrl: {
            type: String,
            default: "",
        },
        adminNote: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

const VideoRequestModel = mongoose.model<IVideoRequest>("VideoRequest", videoRequestSchema);

export default VideoRequestModel;
