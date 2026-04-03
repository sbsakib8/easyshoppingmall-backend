"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSubCategory = exports.updateSubCategory = exports.getSubCategoryById = exports.getSubCategories = exports.createSubCategory = void 0;
const product_model_1 = __importDefault(require("../product/product.model"));
const subcategory_model_1 = __importDefault(require("./subcategory.model"));
const category_model_1 = __importDefault(require("../category/category.model"));
const cloudinary_1 = __importDefault(require("../../utils/cloudinary"));
// ✅ Create SubCategory
const createSubCategory = async (req, res) => {
    try {
        const { name, icon, isActive, metaDescription, metaTitle, category } = req.body;
        // Validate category
        const categoryExists = await category_model_1.default.findById(category);
        if (!categoryExists) {
            res.status(400).json({ success: false, message: "Invalid Category ID" });
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
        // Check duplicate subcategory
        const existingSub = await subcategory_model_1.default.findOne({ name });
        if (existingSub) {
            res.status(400).json({ success: false, message: "SubCategory already exists" });
            return;
        }
        const subCategory = new subcategory_model_1.default({
            name,
            image: imageUrl,
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createSubCategory = createSubCategory;
// ✅ Get All SubCategories
const getSubCategories = async (req, res) => {
    try {
        const subCategories = await subcategory_model_1.default.find({ isActive: true })
            .select("name image slug icon isActive category")
            .populate("category", "name slug")
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).json({ success: true, data: subCategories });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSubCategories = getSubCategories;
// ✅ Get Single SubCategory
const getSubCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const subCategory = await subcategory_model_1.default.findById(id)
            .populate("category", "name slug")
            .lean();
        if (!subCategory) {
            res.status(404).json({ success: false, message: "SubCategory not found" });
            return;
        }
        res.status(200).json({ success: true, data: subCategory });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSubCategoryById = getSubCategoryById;
// ✅ Update SubCategory
const updateSubCategory = async (req, res) => {
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
        const updatedSubCategory = await subcategory_model_1.default.findByIdAndUpdate(id, updateData, {
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateSubCategory = updateSubCategory;
const deleteSubCategory = async (req, res) => {
    try {
        const { id } = req.params;
        // Remove the subcategory from all products that reference it
        await product_model_1.default.updateMany({ subCategory: id }, { $pull: { subCategory: id } });
        const deletedSubCategory = await subcategory_model_1.default.findByIdAndDelete(id);
        if (!deletedSubCategory) {
            res.status(404).json({ success: false, message: "SubCategory not found" });
            return;
        }
        res.status(200).json({ success: true, message: "SubCategory deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteSubCategory = deleteSubCategory;
