import mongoose, { Document, Schema } from "mongoose";

export interface IVideoModule extends Document {
    title: string;
    description: string;
    price: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const videoModuleSchema = new Schema<IVideoModule>(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            default: "",
        },
        price: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

const VideoModuleModel = mongoose.model<IVideoModule>("VideoModule", videoModuleSchema);

export default VideoModuleModel;
