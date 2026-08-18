import mongoose from "mongoose";

export interface IAddress extends Document {
  address_line?: string;
  district?: string; // Renamed from city
  division?: string; // Renamed from state
  upazila_thana?: string; // New field
  pincode?: string;
  country?: string;
  mobile?: number | null;
  status?: boolean;
  userId?: mongoose.Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}
