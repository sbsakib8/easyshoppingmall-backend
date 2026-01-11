import { CartModel } from "../models/cart/cart.model";

export const clearUserCart = async (userId: string) => {
  await CartModel.findOneAndUpdate(
    { userId },
    { $set: { products: [] } },
    { new: true }
  );
};