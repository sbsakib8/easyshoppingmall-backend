"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVideo = exports.updateVideo = exports.createVideo = exports.adminGetAllVideos = exports.getAllVideos = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const videoContent_model_1 = __importDefault(require("./videoContent.model"));
const videoAccess_model_1 = __importDefault(require("../videoAccess/videoAccess.model"));
const videoModule_model_1 = __importDefault(require("../videoModule/videoModule.model"));
const STANDALONE_VIDEO_TYPES = ["standard", "demo"];
const resolveModuleRequirement = async (videoType, moduleId) => {
    const isStandalone = !videoType || STANDALONE_VIDEO_TYPES.includes(videoType);
    if (isStandalone) {
        return { moduleId: undefined };
    }
    if (!moduleId) {
        return { error: `moduleId is required for ${videoType} videos` };
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(moduleId)) {
        return { error: "Invalid moduleId" };
    }
    const module = await videoModule_model_1.default.findById(moduleId);
    if (!module) {
        return { error: "Module not found" };
    }
    const isFreeModule = (module.price ?? 0) === 0;
    if (videoType === "free" && !isFreeModule) {
        return { error: "Free videos must be attached to a free module (price = 0)" };
    }
    if (videoType === "premium" && isFreeModule) {
        return { error: "Premium videos must be attached to a premium module (price > 0)" };
    }
    return { moduleId: new mongoose_1.default.Types.ObjectId(moduleId) };
};
const getAllVideos = async (req, res) => {
    try {
        const scope = String(req.query.scope ?? "").toLowerCase();
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
        // Filter videos based on scope:
        //   - "standalone"  -> only videos with no moduleId (no course association)
        //   - "course"      -> only videos whose parent module + course are active
        //   - default/all   -> return every video whose parent module + course (if any) are active
        const filteredVideos = videos.filter((video) => {
            const rawModuleId = video.populated("moduleId");
            const isStandaloneVideo = !rawModuleId;
            const module = video.moduleId;
            const hasActiveCourse = module && module.courseId;
            if (scope === "standalone") {
                return isStandaloneVideo;
            }
            if (scope === "course") {
                return !isStandaloneVideo && !!hasActiveCourse;
            }
            if (isStandaloneVideo) {
                return true;
            }
            return !!hasActiveCourse;
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
        const resolved = await resolveModuleRequirement(videoType, moduleId);
        if ("error" in resolved) {
            return res.status(400).json({ success: false, message: resolved.error });
        }
        const newVideo = await videoContent_model_1.default.create({
            title,
            description,
            url,
            videoType,
            moduleId: resolved.moduleId,
        });
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
        const existing = await videoContent_model_1.default.findById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Video not found" });
        }
        const nextVideoType = req.body.videoType ?? existing.videoType;
        const nextModuleId = req.body.moduleId !== undefined ? req.body.moduleId : (existing.moduleId ? String(existing.moduleId) : undefined);
        const resolved = await resolveModuleRequirement(nextVideoType, nextModuleId);
        if ("error" in resolved) {
            return res.status(400).json({ success: false, message: resolved.error });
        }
        const updatePayload = {
            ...req.body,
            moduleId: resolved.moduleId,
        };
        const updatedVideo = await videoContent_model_1.default.findByIdAndUpdate(id, updatePayload, { new: true });
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
