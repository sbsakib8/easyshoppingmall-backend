import mongoose, { Document, Schema, Model } from "mongoose";
import { ISubCategory } from "./interface";



// 2. Schema
const subCategorySchema = new Schema<ISubCategory>(
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
    category: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category", 
        required: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

subCategorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name.toLowerCase().replace(/ /g, "-");
  }
  next();
});

// 4. Model type
const SubCategoryModel: Model<ISubCategory> = mongoose.model<ISubCategory>(
  "SubCategory",
  subCategorySchema
);

export default SubCategoryModel;
