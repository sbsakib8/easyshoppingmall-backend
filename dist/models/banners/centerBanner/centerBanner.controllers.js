"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCenterBanner = exports.updateCenterBanner = exports.getSingleCenterBanner = exports.getAllCenterBanner = exports.createCenterBanner = void 0;
const centerBanner_model_1 = __importDefault(require("./centerBanner.model"));
const cloudinary_1 = __importDefault(require("../../../utils/cloudinary"));
// Create Home Banner
const createCenterBanner = async (req, res) => {
    try {
        const { title, Description, Link_URL, status } = req.body;
        const files = req.files;
        let imageUrls = [];
        if (files && files.length > 0) {
            const uploadPromises = files.map(async (file) => {
                const imageUrl = await (0, cloudinary_1.default)(file.buffer);
                return imageUrl;
            });
            imageUrls = await Promise.all(uploadPromises);
        }
        const newBanner = await centerBanner_model_1.default.create({
            title,
            Description,
            Link_URL,
            status,
            images: imageUrls,
        });
        return res.status(201).json({
            success: true,
            message: "Center banner created successfully",
            data: newBanner,
        });
    }
    catch (error) {
        console.error("Create CenterBanner error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.createCenterBanner = createCenterBanner;
//  Get All Banners
const getAllCenterBanner = async (req, res) => {
    try {
        const banners = await centerBanner_model_1.default.find().sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: banners });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllCenterBanner = getAllCenterBanner;
//  Get Single Banner
const getSingleCenterBanner = async (req, res) => {
    try {
        const banner = await centerBanner_model_1.default.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ success: false, message: "Banner not found" });
        }
        return res.status(200).json({ success: true, data: banner });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSingleCenterBanner = getSingleCenterBanner;
//  Update Banner
const updateCenterBanner = async (req, res) => {
    try {
        const { title, Description, Link_URL, status } = req.body;
        const files = req.files;
        let imageUrls = [];
        if (files && files.length > 0) {
            const uploadPromises = files.map(async (file) => {
                const imageUrl = await (0, cloudinary_1.default)(file.buffer);
                return imageUrl;
            });
            imageUrls = await Promise.all(uploadPromises);
        }
        const updatedBanner = await centerBanner_model_1.default.findByIdAndUpdate(req.params.id, {
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
            message: "Center banner updated successfully",
            data: updatedBanner,
        });
    }
    catch (error) {
        console.error("Update CenterBanner error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateCenterBanner = updateCenterBanner;
//  Delete Banner
const deleteCenterBanner = async (req, res) => {
    try {
        const banner = await centerBanner_model_1.default.findByIdAndDelete(req.params.id);
        if (!banner) {
            return res.status(404).json({ success: false, message: "Banner not found" });
        }
        return res.status(200).json({ success: true, message: "Banner deleted successfully" });
    }
    catch (error) {
        console.error("Delete CenterBanner error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteCenterBanner = deleteCenterBanner;
