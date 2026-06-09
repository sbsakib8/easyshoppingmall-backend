"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVideo = exports.updateVideo = exports.createVideo = exports.adminGetAllVideos = exports.getAllVideos = void 0;
const videoContent_model_1 = __importDefault(require("./videoContent.model"));
const videoAccess_model_1 = __importDefault(require("../videoAccess/videoAccess.model"));
const getAllVideos = async (req, res) => {
    try {
        const videos = await videoContent_model_1.default.find({ isActive: true })
            .populate({
            path: "moduleId",
            match: { isActive: true },
            populate: {
                path: "courseId",
                match: { isActive: true }
            }
        })
            .sort({ createdAt: -1 });
        // Filter out videos whose parent module or parent course is missing/inactive
        const filteredVideos = videos.filter((video) => {
            const rawModuleId = video.populated("moduleId");
            // If the video has no raw moduleId in the database, it's a real standalone video, which is allowed
            if (!rawModuleId) {
                return true;
            }
            // If it has a raw moduleId, check if the module and its course are populated and active
            const module = video.moduleId;
            if (!module || !module.courseId) {
                return false;
            }
            return true;
        });
        // Backend URL security: Obscure premium video URLs for unauthorized users
        const processedVideos = await Promise.all(filteredVideos.map(async (video) => {
            const videoObj = video.toObject();
            const module = videoObj.moduleId;
            const course = module?.courseId;
            // Check if the video belongs to a premium course
            const isPremiumCourse = course && course.price > 0;
            // If it's a premium course video and not a demo video, we enforce the paywall
            if (isPremiumCourse && videoObj.videoType !== "demo") {
                const isAdminUser = req.user?.role === "admin";
                if (isAdminUser) {
                    return videoObj; // Admin gets access
                }
                if (req.userId) {
                    const approvedAccess = await videoAccess_model_1.default.findOne({
                        userId: req.userId,
                        $or: [
                            { courseId: course._id, status: "approved" },
                            { videoType: "premium_training", status: "approved" }
                        ]
                    });
                    if (approvedAccess) {
                        return videoObj; // Paid user gets access
                    }
                }
                // User has not paid or is unauthenticated: obscure the YouTube URL
                videoObj.url = "LOCKED";
            }
            return videoObj;
        }));
        res.status(200).json({ success: true, data: processedVideos });
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
