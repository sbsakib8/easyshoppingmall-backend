import mongoose, { Model, Schema } from "mongoose";
import { ICoupon } from "./interface";

const couponSchema = new Schema<ICoupon>(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
        },
        description: {
            type: String,
            default: "",
        },
        discountType: {
            type: String,
            enum: ["percentage", "flat"],
            required: true,
        },
        discountAmount: {
            type: Number,
            required: true,
        },
        maxDiscountAmount: {
            type: Number,
            default: 0, // 0 means no limit for percentage, or unused for flat
        },
        minOrderAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        validFrom: {
            type: Date,
            default: Date.now,
        },
        validUntil: {
            type: Date,
            required: true,
        },
        usageLimit: {
            type: Number,
            default: 0, // 0 means unlimited
        },
        usedCount: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        applicableCategory: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            default: null,
        },
        applicableSubCategory: {
            type: Schema.Types.ObjectId,
            ref: "SubCategory",
            default: null,
        },
        applicableProduct: {
            type: Schema.Types.ObjectId,
            ref: "Product", // Assuming the product model is "Product"
            default: null,
        },
        isForNewUserOnly: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const CouponModel: Model<ICoupon> = mongoose.model<ICoupon>("Coupon", couponSchema);

export default CouponModel;
