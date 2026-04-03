import mongoose, { Schema, Model } from "mongoose";
import { ICategory } from "./interface";

// 2. Schema
const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    image: {
      type: String,
      default: "",
    },
    slug: {
      type: String,
      lowercase: true,
      unique: true,
      trim: true,
    },
    icon: {
      type: String
    },
    isActive: {
      type: Boolean,
      default: true
    },
    metaDescription: {
      type: String
    },
    metaTitle: {
      type: String
    }
  },
  {
    timestamps: true,
  }
);

// Performance indexes
categorySchema.index({ isActive: 1 });
categorySchema.index({ createdAt: -1 });

categorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name.toLowerCase().replace(/ /g, "-");
  }
  next();
});

const CategoryModel: Model<ICategory> = mongoose.model<ICategory>(
  "Category",
  categorySchema
);

export default CategoryModel;
