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
      type: Number,
      default: null,
    },
    productSize: {
      type: String,
      default: "",
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
    images: {
      type: [String],
      default: [],
    },
    more_details: {
      type: Object,
      default: {},
    },
    publish: {
      type: Boolean,
      default: true,
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

export default model<IProduct>("Product", productSchema);
