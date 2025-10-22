"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLeftBanner = exports.updateLeftBanner = exports.getSingleLeftBanner = exports.getAllLeftBanners = exports.createLeftBanner = void 0;
const leftBanner_model_1 = __importDefault(require("./leftBanner.model"));
const cloudinary_1 = __importDefault(require("../../../utils/cloudinary"));
const fs_1 = __importDefault(require("fs"));
// Create Home Banner
const createLeftBanner = async (req, res) => {
    try {
        const { title, Description, Link_URL, status } = req.body;
        const files = req.files;
        let imageUrls = [];
        if (files && files.length > 0) {
            const uploadPromises = files.map(async (file) => {
                const imageUrl = await (0, cloudinary_1.default)(file.path);
                if (fs_1.default.existsSync(file.path))
                    fs_1.default.unlinkSync(file.path);
                return imageUrl;
            });
            imageUrls = await Promise.all(uploadPromises);
        }
        const newBanner = await leftBanner_model_1.default.create({
            title,
            Description,
            Link_URL,
            status,
            images: imageUrls,
        });
        return res.status(201).json({
            success: true,
            message: "Left banner created successfully",
            data: newBanner,
        });
    }
    catch (error) {
        console.error("Create LeftBanner error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.createLeftBanner = createLeftBanner;
//  Get All Banners
const getAllLeftBanners = async (req, res) => {
    try {
        const banners = await leftBanner_model_1.default.find().sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: banners });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllLeftBanners = getAllLeftBanners;
//  Get Single Banner
const getSingleLeftBanner = async (req, res) => {
    try {
        const banner = await leftBanner_model_1.default.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ success: false, message: "Banner not found" });
        }
        return res.status(200).json({ success: true, data: banner });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSingleLeftBanner = getSingleLeftBanner;
//  Update Banner
const updateLeftBanner = async (req, res) => {
    try {
        const { title, Description, Link_URL, status } = req.body;
        const files = req.files;
        let imageUrls = [];
        if (files && files.length > 0) {
            const uploadPromises = files.map(async (file) => {
                const imageUrl = await (0, cloudinary_1.default)(file.path);
                if (fs_1.default.existsSync(file.path))
                    fs_1.default.unlinkSync(file.path);
                return imageUrl;
            });
            imageUrls = await Promise.all(uploadPromises);
        }
        const updatedBanner = await leftBanner_model_1.default.findByIdAndUpdate(req.params.id, {
            title,
            Description,
            Link_URL,
            status,
            ...(imageUrls.length > 0 && { images: imageUrls }),
        }, { new: true });
        if (!updatedBanner) {
            return res.status(404).json({ success: false, message: "Banner not found" });
        }
        return res.status(200).json({
            success: true,
            message: "Left banner updated successfully",
            data: updatedBanner,
        });
    }
    catch (error) {
        console.error("Update LeftBanner error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateLeftBanner = updateLeftBanner;
//  Delete Banner
const deleteLeftBanner = async (req, res) => {
    try {
        const banner = await leftBanner_model_1.default.findByIdAndDelete(req.params.id);
        if (!banner) {
            return res.status(404).json({ success: false, message: "Banner not found" });
        }
        return res.status(200).json({ success: true, message: "Banner deleted successfully" });
    }
    catch (error) {
        console.error("Delete LeftBanner error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteLeftBanner = deleteLeftBanner;
