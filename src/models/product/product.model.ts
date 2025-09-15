import mongoose, { Schema, model } from "mongoose";
import { IProduct } from "./type";

const productSchema: Schema<IProduct> = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    image: {
      type: [String], 
      default: [],
    },
    category: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "category",
      },
    ],
    subCategory: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "subCategory",
      },
    ],
    brand: {
      type: String,
      default: "",
    },
    tags: {
      type: [String], 
      default: [],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    unit: {
      type: String,
      default: "",
    },
    weight: {
      type: Number, 
      default: null,
    },
    size: {
      type: String, 
      default: "",
    },
    rank: {
      type: Number, 
      default: 0,
    },
    stock: {
      type: Number,
      default: null,
    },
    price: {
      type: Number,
      default: null,
    },
    discount: {
      type: Number,
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
    more_details: {
      type: Object,
      default: {},
    },
    publish: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);


export default model<IProduct>("Product", productSchema);
