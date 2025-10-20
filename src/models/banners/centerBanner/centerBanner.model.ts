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
    active: {
         type: Boolean,
          default: true
     },
  },
  { timestamps: true }
);

export default mongoose.models.CenterBanner ||
  mongoose.model<ICenterBanner>("CenterBanner", centerBannerSchema);
