import { Request, Response } from "express";
import ProductModel from "../product/product.model";
import CategoryModel from "./category.model";
import uploadClouinary from "../../utils/cloudinary";
import { cache } from "../../utils/cache";

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
    await cache.del("all_categories");
    await cache.del("category_tree");
    await cache.delByPrefix("subcategories:");
    await cache.delByPrefix("products:");
    await cache.delByPrefix("homepage");

    res.status(201).json({ success: true, message: "Category created successfully", data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Get All Categories
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const showAll = req.query.status === "all";
    const cacheKey = showAll ? "all_categories_admin" : "all_categories";
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      res.status(200).json({ success: true, data: cachedData });
      return;
    }

    const filter: any = showAll ? {} : { isActive: true };
    const categories = await CategoryModel.find(filter)
      .select("name image slug icon isActive")
      .sort({ createdAt: -1 })
      .lean();

    await cache.set(cacheKey, categories, 600); // Cache for 10 minutes
    res.status(200).json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get Categories and Subcategories Tree (Optimized Aggregation)
export const getCategoryTree = async (req: Request, res: Response): Promise<void> => {
  try {
    const showAll = req.query.status === "all";
    const cacheKey = showAll ? "category_tree_admin" : "category_tree";
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      res.status(200).json({ success: true, data: cachedData });
      return;
    }

    const matchStage: any = showAll ? {} : { isActive: true };
    const tree = await CategoryModel.aggregate([
      { $match: matchStage },
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

    await cache.set(cacheKey, tree, 600); // Cache for 10 minutes
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
    await cache.del("all_categories");
    await cache.del("category_tree");
    await cache.delByPrefix("subcategories:");
    await cache.delByPrefix("products:");
    await cache.delByPrefix("homepage");
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

    await cache.del("all_categories");
    await cache.del("category_tree");
    await cache.delByPrefix("subcategories:");
    await cache.delByPrefix("products:");
    await cache.delByPrefix("homepage");
    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
