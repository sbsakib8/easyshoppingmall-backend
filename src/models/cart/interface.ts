import { Document, Types } from "mongoose";

export interface ICartProduct {
  productId: Types.ObjectId | string;
  quantity: number;
  price: number;
  totalPrice: number;
  size?: string;
  color?: string | null;
  weight?: string | null;
}

export interface ICart extends Document {
  userId: Types.ObjectId | string;
  products: ICartProduct[];
  subTotalAmt: number;
  totalAmt: number;
  createdAt?: Date;
  updatedAt?: Date;
}
