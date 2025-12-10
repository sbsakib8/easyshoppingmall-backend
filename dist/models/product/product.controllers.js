"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchProduct = exports.deleteProductDetails = exports.updateProductDetails = exports.getProductDetails = exports.getProductByCategoryAndSubCategory = exports.getProductByCategory = exports.getProductController = exports.createProductController = void 0;
const cloudinary_1 = __importDefault(require("../../utils/cloudinary"));
const product_model_1 = __importDefault(require("./product.model"));
// Create Product
const createProductController = async (req, res) => {
    try {
        const { productName, description, category, subCategory, featured, brand, productWeight, productSize, color, price, productStock, productRank, discount, ratings, tags, more_details, publish, } = req.body;
        // Validation
        if (!productName) {
            res.status(400).json({
                message: "Enter required fields",
                error: true,
                success: false,
            });
            return;
        }
        // ✅ Multiple image upload
        const files = req.files;
        let imageUrls = [];
        if (files && files.length > 0) {
            for (const file of files) {
                if (file.buffer) { // safe check
                    const uploadedUrl = await (0, cloudinary_1.default)(file.buffer);
                    imageUrls.push(uploadedUrl);
                }
            }
        }
        // Auto-generate unique SKU
        const sku = `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        // Product create and save
        const product = await product_model_1.default.create({
            productName,
            description,
            category,
            subCategory,
            featured,
            brand,
            productWeight,
            productSize,
            color,
            price,
            productStock,
            productRank,
            discount,
            ratings,
            tags,
            images: imageUrls,
            more_details,
            publish,
            sku,
        });
        res.json({
            message: "Product Created Successfully",
            data: product,
            error: false,
            success: true,
        });
    }
    catch (error) {
        // Duplicate SKU handle
        if (error.code === 11000) {
            res.status(400).json({
                message: "SKU must be unique",
                error: true,
                success: false,
            });
            return;
        }
        res.status(500).json({
            message: error.message || "Server Error",
            error: true,
            success: false,
        });
    }
};
exports.createProductController = createProductController;
// Get Products (with pagination & search)
const getProductController = async (req, res) => {
    try {
        let { page, limit, search } = req.body;
        page = page || 1;
        limit = limit || 10;
        const query = search
            ? { $text: { $search: search } }
            : {};
        const skip = (page - 1) * limit;
        const [data, totalCount] = await Promise.all([
            product_model_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("category subCategory"),
            product_model_1.default.countDocuments(query),
        ]);
        res.json({
            message: "Product data",
            error: false,
            success: true,
            totalCount,
            totalNoPage: Math.ceil(totalCount / limit),
            data,
        });
    }
    catch (error) {
        res.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        });
    }
};
exports.getProductController = getProductController;
// Get Products by Category
const getProductByCategory = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            res.status(400).json({
                message: "Provide category id",
                error: true,
                success: false,
            });
            return;
        }
        const product = await product_model_1.default.find({
            category: { $in: id },
        }).limit(15);
        res.json({
            message: "Category product list",
            data: product,
            error: false,
            success: true,
        });
    }
    catch (error) {
        res.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        });
    }
};
exports.getProductByCategory = getProductByCategory;
// Get Products by Category & SubCategory
const getProductByCategoryAndSubCategory = async (req, res) => {
    try {
        let { categoryId, subCategoryId, page, limit } = req.body;
        if (!categoryId || !subCategoryId) {
            res.status(400).json({
                message: "Provide categoryId and subCategoryId",
                error: true,
                success: false,
            });
            return;
        }
        page = page || 1;
        limit = limit || 10;
        const query = {
            category: { $in: categoryId },
            subCategory: { $in: subCategoryId },
        };
        const skip = (page - 1) * limit;
        const [data, dataCount] = await Promise.all([
            product_model_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            product_model_1.default.countDocuments(query),
        ]);
        res.json({
            message: "Product list",
            data,
            totalCount: dataCount,
            page,
            limit,
            success: true,
            error: false,
        });
    }
    catch (error) {
        res.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        });
    }
};
exports.getProductByCategoryAndSubCategory = getProductByCategoryAndSubCategory;
// Get Product Details
const getProductDetails = async (req, res) => {
    try {
        const { productId } = req.params;
        const product = await product_model_1.default.findOne({ _id: productId });
        res.json({
            message: "Product details",
            data: product,
            error: false,
            success: true,
        });
    }
    catch (error) {
        res.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        });
    }
};
exports.getProductDetails = getProductDetails;
// Update Product
const updateProductDetails = async (req, res) => {
    try {
        const { _id } = req.body;
        if (!_id) {
            res.status(400).json({
                message: "Provide product _id",
                error: true,
                success: false,
            });
            return;
        }
        const updateProduct = await product_model_1.default.updateOne({ _id }, { ...req.body });
        res.json({
            message: "Updated successfully",
            data: updateProduct,
            error: false,
            success: true,
        });
    }
    catch (error) {
        res.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        });
    }
};
exports.updateProductDetails = updateProductDetails;
// Delete Product
const deleteProductDetails = async (req, res) => {
    try {
        const { _id } = req.body;
        if (!_id) {
            res.status(400).json({
                message: "Provide _id",
                error: true,
                success: false,
            });
            return;
        }
        const deleteProduct = await product_model_1.default.deleteOne({ _id });
        res.json({
            message: "Delete successfully",
            error: false,
            success: true,
            data: deleteProduct,
        });
    }
    catch (error) {
        res.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        });
    }
};
exports.deleteProductDetails = deleteProductDetails;
// Search Product
const searchProduct = async (req, res) => {
    try {
        let { search, page, limit } = req.body;
        page = page || 1;
        limit = limit || 10;
        const query = search ? { $text: { $search: search } } : {};
        const skip = (page - 1) * limit;
        const [data, dataCount] = await Promise.all([
            product_model_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("category subCategory"),
            product_model_1.default.countDocuments(query),
        ]);
        res.json({
            message: "Product data",
            error: false,
            success: true,
            data,
            totalCount: dataCount,
            totalPage: Math.ceil(dataCount / limit),
            page,
            limit,
        });
    }
    catch (error) {
        res.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        });
    }
};
exports.searchProduct = searchProduct;
