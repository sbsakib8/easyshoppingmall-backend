import { Request, Response } from "express";
import ProductModel from "../product/product.model";
import CategoryModel from "./category.model";
import uploadClouinary from "../../utils/cloudinary";
import { memoryCache } from "../../utils/cache";

// ✅ Create Category
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, icon, isActive, metaDescription, metaTitle } = req.body;

    // Check if category exists
    const existingCategory = await CategoryModel.findOne({ name });
    if (existingCategory) {
      res.status(400).json({ success: false, message: "Category already exists" });
      return;
    }
    let imageUrl: string | undefined;
    if (req.file) {
      imageUrl = await uploadClouinary(req.file.buffer);
    } else {
      res.status(400).json({ success: false, message: "not image file provided" });
      return;
    }

    const category = new CategoryModel({
      name,
      image: imageUrl,
      icon,
      isActive,
      metaDescription,
      metaTitle,
    });

    await category.save();
    memoryCache.clear(); // Clear all category/tree cache

    res.status(201).json({ success: true, message: "Category created successfully", data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Get All Categories
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = "all_categories";
    const cachedData = memoryCache.get(cacheKey);
    if (cachedData) {
      res.status(200).json({ success: true, data: cachedData });
      return;
    }

    const categories = await CategoryModel.find({ isActive: true })
      .select("name image slug icon isActive")
      .sort({ createdAt: -1 })
      .lean();

    memoryCache.set(cacheKey, categories, 600); // Cache for 10 minutes
    res.status(200).json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get Categories and Subcategories Tree (Optimized Aggregation)
export const getCategoryTree = async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = "category_tree";
    const cachedData = memoryCache.get(cacheKey);
    if (cachedData) {
      res.status(200).json({ success: true, data: cachedData });
      return;
    }

    const tree = await CategoryModel.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: "subcategories",
          localField: "_id",
          foreignField: "category",
          as: "subcategories"
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          image: 1,
          icon: 1,
          "subcategories._id": 1,
          "subcategories.name": 1,
          "subcategories.slug": 1,
          "subcategories.image": 1,
          "subcategories.icon": 1
        }
      },
      { $sort: { name: 1 } }
    ]);

    memoryCache.set(cacheKey, tree, 600); // Cache for 10 minutes
    res.status(200).json({ success: true, data: tree });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Get Single Category
export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const category = await CategoryModel.findById(id).lean();

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
    if (req.file) {
      const imageUrl = await uploadClouinary(req.file.buffer);
      updateData.image = imageUrl;
    }

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
    memoryCache.clear(); // Clear cache
  } catch (error: any) {
    console.error("Update Category Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Delete Category
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Remove the category from all products that reference it
    await ProductModel.updateMany(
      { category: id },
      { $pull: { category: id } }
    );

    const deletedCategory = await CategoryModel.findByIdAndDelete(id);

    if (!deletedCategory) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }

    memoryCache.clear(); // Clear cache
    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
