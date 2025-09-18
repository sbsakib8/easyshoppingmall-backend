import mongoose from "mongoose";

// 1. Interface
export interface ICartProduct extends Document {
  productId: mongoose.Types.ObjectId | string;
  quantity: number;
  userId: mongoose.Types.ObjectId | string;
  price?: number;
  totalPrice?: number; 
  createdAt?: Date;
  updatedAt?: Date;
}