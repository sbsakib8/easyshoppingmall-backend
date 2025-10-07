import { Request, Response } from "express";
import SubCategoryModel from "./subcategory.model";
import CategoryModel from "../category/category.model";

// ✅ Create SubCategory
export const createSubCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, image, icon, isActive, metaDescription, metaTitle, category } = req.body;

    // Validate category
    const categoryExists = await CategoryModel.findById(category);
    if (!categoryExists) {
      res.status(400).json({ success: false, message: "Invalid Category ID" });
      return;
    }

    // Check duplicate subcategory
    const existingSub = await SubCategoryModel.findOne({ name });
    if (existingSub) {
      res.status(400).json({ success: false, message: "SubCategory already exists" });
      return;
    }

    

    const subCategory = new SubCategoryModel({
      name,
      image,
      icon,
      isActive,
      metaDescription,
      metaTitle,
      category,
    });

    await subCategory.save();

    res.status(201).json({
      success: true,
      message: "SubCategory created successfully",
      data: subCategory,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get All SubCategories
export const getSubCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const subCategories = await SubCategoryModel.find()
      .populate("category", "name slug")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: subCategories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get Single SubCategory
export const getSubCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const subCategory = await SubCategoryModel.findById(id).populate("category", "name slug");

    if (!subCategory) {
      res.status(404).json({ success: false, message: "SubCategory not found" });
      return;
    }

    res.status(200).json({ success: true, data: subCategory });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Update SubCategory
export const updateSubCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.body || Object.keys(req.body).length === 0) {
      res.status(400).json({ success: false, message: "No data provided for update" });
      return;
    }

    const { _id, slug, ...updateData } = req.body;

    const updatedSubCategory = await SubCategoryModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("category", "name slug");

    if (!updatedSubCategory) {
      res.status(404).json({ success: false, message: "SubCategory not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "SubCategory updated successfully",
      data: updatedSubCategory,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Delete SubCategory
export const deleteSubCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deletedSubCategory = await SubCategoryModel.findByIdAndDelete(id);

    if (!deletedSubCategory) {
      res.status(404).json({ success: false, message: "SubCategory not found" });
      return;
    }

    res.status(200).json({ success: true, message: "SubCategory deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
