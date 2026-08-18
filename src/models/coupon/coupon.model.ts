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
            maxlength: [500, "Description cannot exceed 500 characters"],
        },
        discountType: {
            type: String,
            enum: ["percentage", "flat"],
            required: true,
        },
        discountAmount: {
            type: Number,
            required: true,
            min: [0, "Discount amount cannot be negative"],
        },
        maxDiscountAmount: {
            type: Number,
            default: 0,
            min: [0, "Max discount amount cannot be negative"],
        },
        minOrderAmount: {
            type: Number,
            required: true,
            default: 0,
            min: [0, "Min order amount cannot be negative"],
        },
        validFrom: {
            type: Date,
            default: Date.now,
        },
        validUntil: {
            type: Date,
            required: true,
            validate: {
                validator: function (this: any, val: Date) {
                    return !this.validFrom || val >= this.validFrom;
                },
                message: "validUntil must be greater than or equal to validFrom",
            },
        },
        usageLimit: {
            type: Number,
            default: 0,
            min: [0, "Usage limit cannot be negative"],
        },
        usedCount: {
            type: Number,
            default: 0,
            min: [0, "Used count cannot be negative"],
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
            ref: "Product", // Confirmed product model is "Product"
            default: null,
        },
        isForNewUserOnly: {
            type: Boolean,
            default: false,
        },
        perUserLimit: {
            type: Number,
            default: 0,
            min: [0, "Per-user limit cannot be negative"],
        },
    },
    { timestamps: true }
);

const CouponModel: Model<ICoupon> = mongoose.model<ICoupon>("Coupon", couponSchema);

export default CouponModel;
