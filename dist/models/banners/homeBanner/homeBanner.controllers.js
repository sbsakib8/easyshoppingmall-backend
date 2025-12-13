"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteHomeBanner = exports.updateHomeBanner = exports.getSingleHomeBanner = exports.getAllHomeBanners = exports.createHomeBanner = void 0;
const homeBanner_model_1 = __importDefault(require("./homeBanner.model"));
const cloudinary_1 = __importDefault(require("../../../utils/cloudinary")); // your uploader util
const fs_1 = __importDefault(require("fs"));
// Create Home Banner
const createHomeBanner = async (req, res) => {
    try {
        const { title, Description, Link_URL, active } = req.body;
        const files = req.files;
        let imageUrls = [];
        if (files && files.length > 0) {
            const uploadPromises = files.map(async (file) => {
                const imageUrl = await (0, cloudinary_1.default)(file.buffer);
                return imageUrl;
            });
            imageUrls = await Promise.all(uploadPromises);
        }
        const newBanner = await homeBanner_model_1.default.create({
            title,
            Description,
            Link_URL,
            active,
            images: imageUrls,
        });
        return res.status(201).json({
            success: true,
            message: "Home banner created successfully",
            data: newBanner,
        });
    }
    catch (error) {
        console.error("Create HomeBanner error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.createHomeBanner = createHomeBanner;
//  Get All Banners
const getAllHomeBanners = async (req, res) => {
    try {
        const banners = await homeBanner_model_1.default.find().sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: banners });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllHomeBanners = getAllHomeBanners;
//  Get Single Banner
const getSingleHomeBanner = async (req, res) => {
    try {
        const banner = await homeBanner_model_1.default.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ success: false, message: "Banner not found" });
        }
        return res.status(200).json({ success: true, data: banner });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSingleHomeBanner = getSingleHomeBanner;
//  Update Banner
const updateHomeBanner = async (req, res) => {
    try {
        const { title, Description, Link_URL, active } = req.body;
        const files = req.files;
        let imageUrls = [];
        if (files && files.length > 0) {
            const uploadPromises = files.map(async (file) => {
                const imageUrl = await (0, cloudinary_1.default)(file.buffer);
                if (fs_1.default.existsSync(file.path))
                    fs_1.default.unlinkSync(file.path);
                return imageUrl;
            });
            imageUrls = await Promise.all(uploadPromises);
        }
        const updatedBanner = await homeBanner_model_1.default.findByIdAndUpdate(req.params.id, {
            title,
            Description,
            Link_URL,
            active,
            ...(imageUrls.length > 0 && { images: imageUrls }),
        }, { new: true });
        if (!updatedBanner) {
            return res.status(404).json({ success: false, message: "Banner not found" });
        }
        return res.status(200).json({
            success: true,
            message: "Home banner updated successfully",
            data: updatedBanner,
        });
    }
    catch (error) {
        console.error("Update HomeBanner error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateHomeBanner = updateHomeBanner;
//  Delete Banner
const deleteHomeBanner = async (req, res) => {
    try {
        const banner = await homeBanner_model_1.default.findByIdAndDelete(req.params.id);
        if (!banner) {
            return res.status(404).json({ success: false, message: "Banner not found" });
        }
        return res.status(200).json({ success: true, message: "Banner deleted successfully" });
    }
    catch (error) {
        console.error("Delete HomeBanner error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteHomeBanner = deleteHomeBanner;
