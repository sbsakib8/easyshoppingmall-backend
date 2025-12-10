"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.getCategoryById = exports.getCategories = exports.createCategory = void 0;
const category_model_1 = __importDefault(require("./category.model"));
const cloudinary_1 = __importDefault(require("../../utils/cloudinary"));
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
        const categories = await category_model_1.default.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: categories });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCategories = getCategories;
//  Get Single Category
const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await category_model_1.default.findById(id);
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
        const deletedCategory = await category_model_1.default.findByIdAndDelete(id);
        if (!deletedCategory) {
            res.status(404).json({ success: false, message: "Category not found" });
            return;
        }
        res.status(200).json({ success: true, message: "Category deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteCategory = deleteCategory;
