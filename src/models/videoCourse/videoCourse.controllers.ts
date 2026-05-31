import { Request, Response } from "express";
import VideoCourse from "./videoCourse.model";
import { AuthRequest } from "../../middlewares/isAuth";
import VideoModuleModel from "../videoModule/videoModule.model";
import VideoContentModel from "../videoContent/videoContent.model";

export const getAllCourses = async (req: Request, res: Response) => {
    try {
        const courses = await VideoCourse.find({ isActive: true }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: courses });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const adminGetAllCourses = async (req: AuthRequest, res: Response) => {
    try {
        const courses = await VideoCourse.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: courses });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createCourse = async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, price, discountPrice, referralBonus, isActive } = req.body;
        const newCourse = await VideoCourse.create({ title, description, price, discountPrice, referralBonus, isActive });
        res.status(201).json({ success: true, data: newCourse });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateCourse = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const updatedCourse = await VideoCourse.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json({ success: true, data: updatedCourse });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteCourse = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        // Find all modules for this course
        const modules = await VideoModuleModel.find({ courseId: id });
        const moduleIds = modules.map(m => m._id);
        
        // Delete all videos belonging to these modules
        await VideoContentModel.deleteMany({ moduleId: { $in: moduleIds } });
        
        // Delete all modules belonging to this course
        await VideoModuleModel.deleteMany({ courseId: id });
        
        // Delete the course itself
        await VideoCourse.findByIdAndDelete(id);
        
        res.status(200).json({ success: true, message: "Course and its modules/videos deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
