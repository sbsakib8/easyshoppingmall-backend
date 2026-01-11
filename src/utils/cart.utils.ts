import mongoose from "mongoose";
import { CartModel } from "../models/cart/cart.model";

export const clearUserCart = async (
  userId: string | mongoose.Types.ObjectId
) => {
  await CartModel.findOneAndUpdate(
    { userId },
    { $set: { products: [] } },
    { new: true }
  );
};