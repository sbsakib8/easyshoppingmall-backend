import mongoose, { Document, Schema } from "mongoose";

export interface IVideoContent extends Document {
    title: string;
    description: string;
    url: string;
    videoType: "standard" | "demo" | "free" | "premium";
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const videoContentSchema = new Schema<IVideoContent>(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            default: "",
        },
        url: {
            type: String,
            required: true,
        },
        videoType: {
            type: String,
            enum: ["standard", "demo", "free", "premium"],
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

const VideoContentModel = mongoose.model<IVideoContent>("VideoContent", videoContentSchema);

export default VideoContentModel;
