import mongoose, { Schema, Document } from "mongoose";
import { IRightBanner } from "./interface";


const rightBannerSchema = new Schema<IRightBanner>(
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

export default mongoose.models.RightBanner ||
  mongoose.model<IRightBanner>("RightBanner", rightBannerSchema);
