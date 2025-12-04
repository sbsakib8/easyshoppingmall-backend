import mongoose, { Model, Schema } from "mongoose";
import { ICart } from "./interface";

const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: [
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
        price: {
          type: Number,
          default: 0,
        },
        totalPrice: {
          type: Number,
          default: 0,
        },
        selectedColor: { type: String },
        selectedSize: { type: String },
        selectedWeight: { type: String },
      },

    ],
    subTotalAmt: { type: Number, default: 0 },
    totalAmt: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Pre-save hook to update totals
cartSchema.pre("save", function (next) {
  this.subTotalAmt = this.products.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  this.totalAmt = this.subTotalAmt; // Add taxes/shipping if needed
  next();
});

export const CartModel: Model<ICart> = mongoose.model<ICart>("Cart", cartSchema);
