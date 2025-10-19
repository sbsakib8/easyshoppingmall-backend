import mongoose, { Schema, Document } from "mongoose";
import { IHomeBanner } from "./interface";


const homeBannerSchema = new Schema<IHomeBanner>(
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

export default mongoose.models.HomeBanner ||
  mongoose.model<IHomeBanner>("HomeBanner", homeBannerSchema);
