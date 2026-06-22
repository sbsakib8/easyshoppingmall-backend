import mongoose, { Schema, model } from "mongoose";
import { INotice } from "./interface";

const NoticeSchema: Schema<INotice> = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    keyPoints: {
      type: [String],
      default: [],
    },
    button: {
      text: {
        type: String,
        default: null,
      },
      color: {
        type: String,
        default: "#1976d2",
      },
      url: {
        type: String,
        default: null,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for active notices sorted by priority
NoticeSchema.index({ isActive: 1, priority: -1 });

const Notice = model<INotice>("Notice", NoticeSchema);
export default Notice;
