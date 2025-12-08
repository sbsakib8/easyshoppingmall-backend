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
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  { timestamps: true }
);

export default mongoose.models.LeftBanner ||
  mongoose.model<ILeftBanner>("LeftBanner", leftBannerSchema);
