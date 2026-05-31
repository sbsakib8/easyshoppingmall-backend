import mongoose, { Document, Schema } from "mongoose";

export interface IReferral extends Document {
  referralPercentage: number;
  referralBonusPerProduct: number;
  createdAt: Date;
  updatedAt: Date;
}

const referralSchema = new Schema<IReferral>(
  {
    referralPercentage: {
      type: Number,
      default: 0,
    },
    referralBonusPerProduct: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const ReferralModel = mongoose.model<IReferral>("Referral", referralSchema);

export default ReferralModel;
