import mongoose, { Document, Schema, Model } from "mongoose";
import { ICartProduct } from "./interface";



// 2. Schema
const cartProductSchema = new Schema<ICartProduct>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product", 
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, "Quantity can not be less than 1"], 
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    price: {
      type: Number,
      default: 0, 
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

cartProductSchema.pre("save", function (next) {
  if (this.price && this.quantity) {
    this.totalPrice = this.price * this.quantity;
  }
  next();
});

// 4. Model type
const CartProductModel: Model<ICartProduct> = mongoose.model<ICartProduct>(
  "CartProduct",
  cartProductSchema
);

export default CartProductModel;
