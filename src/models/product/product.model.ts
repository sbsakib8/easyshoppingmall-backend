import mongoose, { Schema, model } from "mongoose";
import { IProduct } from "./type";

const productSchema: Schema<IProduct> = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    category: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    subCategory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCategory",
      },
    ],
    featured: {
      type: Boolean,
      default: false,
    },
    brand: {
      type: String,
      default: "",
    },
    productWeight: {
      type: [String],
      default: [],
    },
    productSize: {
      type: [String],
      default: [],
    },
    color: {
      type: [String],
      default: [],
    },
    price: {
      type: Number,
      default: null,
    },
    productStock: {
      type: Number,
      default: null,
    },
    productRank: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: null,
    },
    ratings: {
      type: Number,
      default: 5,
    },
    tags: {
      type: [String],
      default: [],
    },
    productStatus: {
      type: [{
        type: String,
        enum: ['hot', 'cold']
      }],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    video: {
      type: [String],
      default: [],
    },
    video_link: {
      type: String,
      default: null,
    },
    more_details: {
      type: Object,
      default: {},
    },
    publish: {
      type: Boolean,
      default: true,
    },
    gender: {
      type: String,
      default: "unisex",
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ ADD THIS
productSchema.index({
  productName: "text",
  description: "text",
  brand: "text",
  tags: "text",
});

export default model<IProduct>("Product", productSchema);
