import mongoose, { Document, Schema } from "mongoose";

export interface IVideoCourse extends Document {
    title: string;
    description: string;
    price: number;
    discountPrice?: number;
    referralBonus?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const videoCourseSchema = new Schema<IVideoCourse>(
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
        discountPrice: {
            type: Number,
            default: 0,
        },
        referralBonus: {
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

const VideoCourseModel = mongoose.model<IVideoCourse>("VideoCourse", videoCourseSchema);

export default VideoCourseModel;
