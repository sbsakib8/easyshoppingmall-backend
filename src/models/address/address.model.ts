import mongoose, { Document, Schema, Model } from "mongoose";
import { IAddress } from "./interface";

const addressSchema = new Schema<IAddress>(
  {
    address_line: {
      type: String,
      default: "",
    },
    district: { // Renamed from city
      type: String,
      default: "",
    },
    division: { // Renamed from state
      type: String,
      default: "",
    },
    upazila_thana: { // New field for sub-district/thana
      type: String,
      default: "",
    },
    pincode: {
      type: String,
    },
    country: {
      type: String,
    },
    mobile: {
      type: Number,
      default: null,
    },
    status: {
      type: Boolean,
      default: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User", 
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

addressSchema.index({ country: 1 });

// 3. Model type
const AddressModel: Model<IAddress> = mongoose.model<IAddress>(
  "Address",
  addressSchema
);

export default AddressModel;
