import mongoose, { Schema, Document } from "mongoose";
import { ILeftBanner } from "./interface";


const leftBannerSchema = new Schema<ILeftBanner>(
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

export default mongoose.models.LeftBanner ||
  mongoose.model<ILeftBanner>("LeftBanner", leftBannerSchema);
