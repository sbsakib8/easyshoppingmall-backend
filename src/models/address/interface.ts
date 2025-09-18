import mongoose from "mongoose";

export interface IAddress extends Document {
  address_line?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  mobile?: number | null;
  status?: boolean;
  userId?: mongoose.Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}
