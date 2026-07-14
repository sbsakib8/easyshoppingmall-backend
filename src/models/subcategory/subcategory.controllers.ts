import { Request, Response } from "express";
import ProductModel from "../product/product.model";
import SubCategoryModel from "./subcategory.model";
import CategoryModel from "../category/category.model";
import uploadClouinary from "../../utils/cloudinary";
import { cache } from "../../utils/cache";
import { revalidateFrontend } from "../../utils/revalidate";

// ✅ Create SubCategory
export const createSubCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, icon, isActive, metaDescription, metaTitle, category } = req.body;

    // Validate category
    const categoryExists = await CategoryModel.findById(category);
    if (!categoryExists) {
      res.status(400).json({ success: false, message: "Invalid Category ID" });
      return;
    }
    let imageUrl: string | undefined;
    if (req.file) {
      imageUrl = await uploadClouinary(req.file.buffer);
    } else {
      res.status(400).json({ success: false, message: "not image file provided" });
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
      image: imageUrl,
      icon,
      isActive,
      metaDescription,
      metaTitle,
      category,
    });

    await subCategory.save();

    await cache.delByPrefix("subcategories:");
    await cache.del("all_categories");
    await cache.del("category_tree");
    await cache.delByPrefix("products:");
    await cache.delByPrefix("homepage");
    revalidateFrontend();

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
    const { filterType } = req.query;
    const showAll = req.query.status === "all";

    const filter: any = showAll ? {} : { isActive: true };

    if (filterType === "new-products" || filterType === "boost-products") {
      const productFilter: any = { publish: true };
      
      if (filterType === "new-products") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        productFilter.createdAt = { $gte: thirtyDaysAgo };
      } else if (filterType === "boost-products") {
        productFilter.isBoost = true;
      }

      const subCategoryIds = await ProductModel.distinct("subCategory", productFilter);
      filter._id = { $in: subCategoryIds };
    }

    const subCategories = await SubCategoryModel.find(filter)
      .select("name image slug icon isActive category")
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .lean();

    res.set('Cache-Control', 'private, no-cache');
    res.status(200).json({ success: true, data: subCategories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get Single SubCategory
export const getSubCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const subCategory = await SubCategoryModel.findById(id)
      .populate("category", "name slug")
      .lean();

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

    if (req.file) {
      const imageUrl = await uploadClouinary(req.file.buffer);
      updateData.image = imageUrl;
    }

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
    await cache.delByPrefix("subcategories:");
    await cache.del("all_categories");
    await cache.del("category_tree");
    await cache.delByPrefix("products:");
    await cache.delByPrefix("homepage");
    revalidateFrontend();
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const deleteSubCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Remove the subcategory from all products that reference it
    await ProductModel.updateMany(
      { subCategory: id },
      { $pull: { subCategory: id } }
    );

    const deletedSubCategory = await SubCategoryModel.findByIdAndDelete(id);

    if (!deletedSubCategory) {
      res.status(404).json({ success: false, message: "SubCategory not found" });
      return;
    }

    res.status(200).json({ success: true, message: "SubCategory deleted successfully" });
    await cache.delByPrefix("subcategories:");
    await cache.del("all_categories");
    await cache.del("category_tree");
    await cache.delByPrefix("products:");
    await cache.delByPrefix("homepage");
    revalidateFrontend();
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
