"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVideo = exports.updateVideo = exports.createVideo = exports.adminGetAllVideos = exports.getAllVideos = void 0;
const videoContent_model_1 = __importDefault(require("./videoContent.model"));
const getAllVideos = async (req, res) => {
    try {
        const videos = await videoContent_model_1.default.find({ isActive: true }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: videos });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllVideos = getAllVideos;
// Admin Controllers
const adminGetAllVideos = async (req, res) => {
    try {
        const videos = await videoContent_model_1.default.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: videos });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.adminGetAllVideos = adminGetAllVideos;
const createVideo = async (req, res) => {
    try {
        const { title, description, url, videoType, moduleId } = req.body;
        const newVideo = await videoContent_model_1.default.create({ title, description, url, videoType, moduleId });
        res.status(201).json({ success: true, data: newVideo });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createVideo = createVideo;
const updateVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedVideo = await videoContent_model_1.default.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json({ success: true, data: updatedVideo });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateVideo = updateVideo;
const deleteVideo = async (req, res) => {
    try {
        const { id } = req.params;
        await videoContent_model_1.default.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Video deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteVideo = deleteVideo;
