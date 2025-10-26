import mongoose, { Document } from "mongoose";

export interface IWishlist extends Document {
  userId: mongoose.Types.ObjectId | string;
  products: {
    productId: mongoose.Types.ObjectId | string;
    addedAt?: Date;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}
