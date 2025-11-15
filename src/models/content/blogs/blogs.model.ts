import mongoose, { Schema, Document } from "mongoose";
import moment from "moment";
import "moment/locale/bn"; 
import { IBlog } from "./interface";


const BlogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    category: { type: String, required: true },
    status: { type: String, enum: ["Draft", "Published"], default: "Draft" },
    image: { type: String },
    excerpt: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    createdDateBn: { type: String },
    createdTimeBn: { type: String },
    
  },
  { timestamps: true }
);

BlogSchema.pre("save", function (next) {
  const now = moment().locale("bn");
  this.createdDateBn = now.format("DD MMMM, YYYY");
  this.createdTimeBn = now.format("hh:mm A");
  next();
});

BlogSchema.pre("findOneAndUpdate", function (next) {
  const now = moment().locale("bn");
  this.set({
    createdDateBn: now.format("DD MMMM, YYYY"),
    createdTimeBn: now.format("hh:mm A"),
  });
  next();
});

export default mongoose.model<IBlog>("Blog", BlogSchema);
