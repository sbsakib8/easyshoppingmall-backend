import mongoose, { Document } from "mongoose";

export interface ICoupon extends Document {
    code: string;
    description: string;
    discountType: "percentage" | "flat";
    discountAmount: number;
    maxDiscountAmount: number; // For percentage bounds, or just 0 if flat
    minOrderAmount: number;
    validFrom: Date;
    validUntil: Date;
    usageLimit: number; // 0 for unlimited
    usedCount: number;
    isActive: boolean;
    applicableCategory: mongoose.Types.ObjectId | null;
    applicableSubCategory: mongoose.Types.ObjectId | null;
    applicableProduct: mongoose.Types.ObjectId | null;
    isForNewUserOnly: boolean;
}
