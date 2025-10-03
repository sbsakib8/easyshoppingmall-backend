import { Request, Response } from "express";
import CategoryModel from "./category.model";

// ✅ Create Category
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, image, icon, isActive, metaDescription, metaTitle } = req.body;

    // Check if category exists
    const existingCategory = await CategoryModel.findOne({ name });
    if (existingCategory) {
      res.status(400).json({ success: false, message: "Category already exists" });
      return;
    }

    const category = new CategoryModel({
      name,
      image,
      icon,
      isActive,
      metaDescription,
      metaTitle,
    });

    await category.save();

    res.status(201).json({ success: true, message: "Category created successfully", data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Get All Categories
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await CategoryModel.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Get Single Category
export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const category = await CategoryModel.findById(id);

    if (!category) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }

    res.status(200).json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Update Category
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.body || Object.keys(req.body).length === 0) {
      res.status(400).json({ success: false, message: "No data provided for update" });
      return;
    }

    const { _id, slug, ...updateData } = req.body;

    const updatedCategory = await CategoryModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (error: any) {
    console.error("Update Category Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


//  Delete Category
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deletedCategory = await CategoryModel.findByIdAndDelete(id);

    if (!deletedCategory) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
