import { Request, Response } from "express";
import VideoModuleModel from "./videoModule.model";
import VideoContentModel from "../videoContent/videoContent.model";
// import { AuthRequest } from "../../middlewares/user.middelwear";
type AuthRequest = Request;

// Create a new module (Admin)
export const createModule = async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, price, isActive, courseId } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, message: "Title is required" });
        }

        const newModule = new VideoModuleModel({
            title,
            description,
            price,
            isActive,
            courseId
        });

        await newModule.save();
        res.status(201).json({ success: true, message: "Module created successfully", data: newModule });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error });
    }
};

// Get all modules (Admin)
export const getAllModulesAdmin = async (req: AuthRequest, res: Response) => {
    try {
        const modules = await VideoModuleModel.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: modules });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error });
    }
};

// Get active modules (Public/Dropshipper)
export const getActiveModules = async (req: Request, res: Response) => {
    try {
        const modules = await VideoModuleModel.find({ isActive: true }).sort({ createdAt: 1 });
        res.status(200).json({ success: true, data: modules });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error });
    }
};

// Update a module (Admin)
export const updateModule = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const updated = await VideoModuleModel.findByIdAndUpdate(id, req.body, { new: true });
        if (!updated) {
            return res.status(404).json({ success: false, message: "Module not found" });
        }
        res.status(200).json({ success: true, message: "Module updated successfully", data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error });
    }
};

// Delete a module (Admin)
export const deleteModule = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        // Delete all videos belonging to this module
        await VideoContentModel.deleteMany({ moduleId: id });
        
        const deleted = await VideoModuleModel.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Module not found" });
        }
        res.status(200).json({ success: true, message: "Module and its videos deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error });
    }
};
