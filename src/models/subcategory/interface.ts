import mongoose, { Document } from "mongoose";

export interface ISubCategory extends Document {
  name: string;
  image?: string;
  slug?: string;
  category: mongoose.Types.ObjectId[] | string[];
  createdAt?: Date;
  updatedAt?: Date;
}