import { Request, Response } from "express";
import mongoose from "mongoose";
import VideoContent from "./videoContent.model";
import { AuthRequest } from "../../middlewares/isAuth";
import VideoAccess from "../videoAccess/videoAccess.model";
import VideoModuleModel from "../videoModule/videoModule.model";

const STANDALONE_VIDEO_TYPES = ["standard", "demo"] as const;

const resolveModuleRequirement = async (
    videoType: string | undefined,
    moduleId: string | undefined
) => {
    const isStandalone = !videoType || (STANDALONE_VIDEO_TYPES as readonly string[]).includes(videoType);

    if (isStandalone) {
        return { moduleId: undefined as mongoose.Types.ObjectId | undefined };
    }

    if (!moduleId) {
        return { error: `moduleId is required for ${videoType} videos` };
    }

    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
        return { error: "Invalid moduleId" };
    }

    const module = await VideoModuleModel.findById(moduleId);
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

    return { moduleId: new mongoose.Types.ObjectId(moduleId) };
};

export const getAllVideos = async (req: AuthRequest, res: Response) => {
    try {
        const scope = String(req.query.scope ?? "").toLowerCase();

        const videos = await VideoContent.find({ isActive: true })
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
        const filteredVideos = videos.filter((video: any) => {
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
        const processedVideos = await Promise.all(
            filteredVideos.map(async (video: any) => {
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
                        const approvedAccess = await VideoAccess.findOne({
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
            })
        );

        res.status(200).json({ success: true, data: processedVideos });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin Controllers
export const adminGetAllVideos = async (req: Request, res: Response) => {
    try {
        const videos = await VideoContent.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: videos });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createVideo = async (req: Request, res: Response) => {
    try {
        const { title, description, url, videoType, moduleId } = req.body;
        const resolved = await resolveModuleRequirement(videoType, moduleId);
        if ("error" in resolved) {
            return res.status(400).json({ success: false, message: resolved.error });
        }
        const newVideo = await VideoContent.create({
            title,
            description,
            url,
            videoType,
            moduleId: resolved.moduleId,
        });
        res.status(201).json({ success: true, data: newVideo });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateVideo = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const existing = await VideoContent.findById(id);
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

        const updatedVideo = await VideoContent.findByIdAndUpdate(id, updatePayload, { new: true });
        res.status(200).json({ success: true, data: updatedVideo });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteVideo = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await VideoContent.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Video deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
