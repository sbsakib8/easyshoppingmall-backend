"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.getCategoryById = exports.getCategoryTree = exports.getCategories = exports.createCategory = void 0;
const product_model_1 = __importDefault(require("../product/product.model"));
const category_model_1 = __importDefault(require("./category.model"));
const cloudinary_1 = __importDefault(require("../../utils/cloudinary"));
const cache_1 = require("../../utils/cache");
const revalidate_1 = require("../../utils/revalidate");
// ✅ Create Category
const createCategory = async (req, res) => {
    try {
        const { name, icon, isActive, metaDescription, metaTitle } = req.body;
        // Check if category exists
        const existingCategory = await category_model_1.default.findOne({ name });
        if (existingCategory) {
            res.status(400).json({ success: false, message: "Category already exists" });
            return;
        }
        let imageUrl;
        if (req.file) {
            imageUrl = await (0, cloudinary_1.default)(req.file.buffer);
        }
        else {
            res.status(400).json({ success: false, message: "not image file provided" });
            return;
        }
        const category = new category_model_1.default({
            name,
            image: imageUrl,
            icon,
            isActive,
            metaDescription,
            metaTitle,
        });
        await category.save();
        await cache_1.cache.del("all_categories");
        await cache_1.cache.del("category_tree");
        await cache_1.cache.delByPrefix("subcategories:");
        await cache_1.cache.delByPrefix("products:");
        await cache_1.cache.delByPrefix("homepage");
        (0, revalidate_1.revalidateFrontend)();
        res.status(201).json({ success: true, message: "Category created successfully", data: category });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createCategory = createCategory;
//  Get All Categories
const getCategories = async (req, res) => {
    try {
        const showAll = req.query.status === "all";
        const filter = showAll ? {} : { isActive: true };
        const categories = await category_model_1.default.find(filter)
            .select("name image slug icon isActive")
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).json({ success: true, data: categories });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCategories = getCategories;
// ✅ Get Categories and Subcategories Tree (Optimized Aggregation)
const getCategoryTree = async (req, res) => {
    try {
        const showAll = req.query.status === "all";
        const matchStage = showAll ? {} : { isActive: true };
        const tree = await category_model_1.default.aggregate([
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
        res.status(200).json({ success: true, data: tree });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCategoryTree = getCategoryTree;
//  Get Single Category
const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await category_model_1.default.findById(id).lean();
        if (!category) {
            res.status(404).json({ success: false, message: "Category not found" });
            return;
        }
        res.status(200).json({ success: true, data: category });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCategoryById = getCategoryById;
//  Update Category
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.body || Object.keys(req.body).length === 0) {
            res.status(400).json({ success: false, message: "No data provided for update" });
            return;
        }
        const { _id, slug, ...updateData } = req.body;
        if (req.file) {
            const imageUrl = await (0, cloudinary_1.default)(req.file.buffer);
            updateData.image = imageUrl;
        }
        const updatedCategory = await category_model_1.default.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (!updatedCategory) {
            res.status(404).json({ success: false, message: "Category not found" });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: updatedCategory,
        });
        await cache_1.cache.del("all_categories");
        await cache_1.cache.del("category_tree");
        await cache_1.cache.delByPrefix("subcategories:");
        await cache_1.cache.delByPrefix("products:");
        await cache_1.cache.delByPrefix("homepage");
        (0, revalidate_1.revalidateFrontend)();
    }
    catch (error) {
        console.error("Update Category Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateCategory = updateCategory;
//  Delete Category
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        // Remove the category from all products that reference it
        await product_model_1.default.updateMany({ category: id }, { $pull: { category: id } });
        const deletedCategory = await category_model_1.default.findByIdAndDelete(id);
        if (!deletedCategory) {
            res.status(404).json({ success: false, message: "Category not found" });
            return;
        }
        await cache_1.cache.del("all_categories");
        await cache_1.cache.del("category_tree");
        await cache_1.cache.delByPrefix("subcategories:");
        await cache_1.cache.delByPrefix("products:");
        await cache_1.cache.delByPrefix("homepage");
        (0, revalidate_1.revalidateFrontend)();
        res.status(200).json({ success: true, message: "Category deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteCategory = deleteCategory;
