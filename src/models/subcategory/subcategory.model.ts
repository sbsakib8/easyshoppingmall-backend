import mongoose, { Schema, Model } from "mongoose";
import { ISubCategory } from "./interface";

// Schema
const subCategorySchema = new Schema<ISubCategory>(
  {

    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      lowercase: true,
      unique: true,
      trim: true,
    },
    image: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    metaDescription: {
      type: String,
    },
    metaTitle: {
      type: String,
    },
    // Reference to Category
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Performance indexes
subCategorySchema.index({ category: 1 });
subCategorySchema.index({ isActive: 1 });
subCategorySchema.index({ createdAt: -1 });
subCategorySchema.index({ category: 1, isActive: 1 }); // Compound index for filtering active subs by category

// Generate slug automatically
subCategorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name.toLowerCase().replace(/ /g, "-");
  }
  next();
});

const SubCategoryModel: Model<ISubCategory> = mongoose.model<ISubCategory>(
  "SubCategory",
  subCategorySchema
);

export default SubCategoryModel;
