"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCourse = exports.updateCourse = exports.createCourse = exports.adminGetAllCourses = exports.getAllCourses = void 0;
const videoCourse_model_1 = __importDefault(require("./videoCourse.model"));
const videoModule_model_1 = __importDefault(require("../videoModule/videoModule.model"));
const videoContent_model_1 = __importDefault(require("../videoContent/videoContent.model"));
const getAllCourses = async (req, res) => {
    try {
        const courses = await videoCourse_model_1.default.find({ isActive: true }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: courses });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllCourses = getAllCourses;
const adminGetAllCourses = async (req, res) => {
    try {
        const courses = await videoCourse_model_1.default.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: courses });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.adminGetAllCourses = adminGetAllCourses;
const createCourse = async (req, res) => {
    try {
        const { title, description, price, discountPrice, referralBonus, isActive } = req.body;
        const newCourse = await videoCourse_model_1.default.create({ title, description, price, discountPrice, referralBonus, isActive });
        res.status(201).json({ success: true, data: newCourse });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createCourse = createCourse;
const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedCourse = await videoCourse_model_1.default.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json({ success: true, data: updatedCourse });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateCourse = updateCourse;
const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        // Find all modules for this course
        const modules = await videoModule_model_1.default.find({ courseId: id });
        const moduleIds = modules.map(m => m._id);
        // Delete all videos belonging to these modules
        await videoContent_model_1.default.deleteMany({ moduleId: { $in: moduleIds } });
        // Delete all modules belonging to this course
        await videoModule_model_1.default.deleteMany({ courseId: id });
        // Delete the course itself
        await videoCourse_model_1.default.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Course and its modules/videos deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteCourse = deleteCourse;
