import mongoose, { Schema, Model } from "mongoose";
import { IWishlist } from "./interface";

const wishlistSchema = new Schema<IWishlist>(
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
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const WishlistModel: Model<IWishlist> = mongoose.model<IWishlist>("Wishlist", wishlistSchema);
