import mongoose, { Document, Schema, Model } from "mongoose";
import { IAddress } from "./interface";

const addressSchema = new Schema<IAddress>(
  {
    address_line: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    state: {
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

// 3. Model type
const AddressModel: Model<IAddress> = mongoose.model<IAddress>(
  "Address",
  addressSchema
);

export default AddressModel;
