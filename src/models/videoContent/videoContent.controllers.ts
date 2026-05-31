import { Request, Response } from "express";
import VideoContent from "./videoContent.model";
import { AuthRequest } from "../../middlewares/isAuth";
import VideoAccess from "../videoAccess/videoAccess.model";

export const getAllVideos = async (req: AuthRequest, res: Response) => {
    try {
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

        // Filter out videos whose parent module or parent course is missing/inactive
        const filteredVideos = videos.filter((video: any) => {
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
        const newVideo = await VideoContent.create({ title, description, url, videoType, moduleId });
        res.status(201).json({ success: true, data: newVideo });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateVideo = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updatedVideo = await VideoContent.findByIdAndUpdate(id, req.body, { new: true });
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
