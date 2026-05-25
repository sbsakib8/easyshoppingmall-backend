import { Request, Response } from "express";
import VideoContent from "./videoContent.model";

export const getAllVideos = async (req: Request, res: Response) => {
    try {
        const videos = await VideoContent.find({ isActive: true }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: videos });
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
