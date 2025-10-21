import mongoose, { Schema, Document } from "mongoose";
import { ICenterBanner } from "./interface";

const centerBannerSchema = new Schema<ICenterBanner>(
  {
    title:
    {
      type: String,
      default: ""
    },
    Description: {
      type: String,
      default: ""
    },
    images: {
      type: [String],
      default: []
    },
    Link_URL: {
      type: String
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  { timestamps: true }
);

export default mongoose.models.CenterBanner ||
  mongoose.model<ICenterBanner>("CenterBanner", centerBannerSchema);
