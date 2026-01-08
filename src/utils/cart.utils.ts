import { CartModel } from "../models/cart/cart.model";
import { Types } from "mongoose";

export const clearUserCart = async (userId: Types.ObjectId | string) => {
  const cart = await CartModel.findOne({ userId: userId });
  if (cart) {
    cart.products = [];
    cart.subTotalAmt = 0;
    cart.totalAmt = 0;
    await cart.save();
    return true;
  }
  return false;
};