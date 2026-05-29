"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteModule = exports.updateModule = exports.getActiveModules = exports.getAllModulesAdmin = exports.createModule = void 0;
const videoModule_model_1 = __importDefault(require("./videoModule.model"));
const videoContent_model_1 = __importDefault(require("../videoContent/videoContent.model"));
// Create a new module (Admin)
const createModule = async (req, res) => {
    try {
        const { title, description, price, isActive, courseId } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, message: "Title is required" });
        }
        const newModule = new videoModule_model_1.default({
            title,
            description,
            price,
            isActive,
            courseId
        });
        await newModule.save();
        res.status(201).json({ success: true, message: "Module created successfully", data: newModule });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error", error });
    }
};
exports.createModule = createModule;
// Get all modules (Admin)
const getAllModulesAdmin = async (req, res) => {
    try {
        const modules = await videoModule_model_1.default.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: modules });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error", error });
    }
};
exports.getAllModulesAdmin = getAllModulesAdmin;
// Get active modules (Public/Dropshipper)
const getActiveModules = async (req, res) => {
    try {
        const modules = await videoModule_model_1.default.find({ isActive: true }).sort({ createdAt: 1 });
        res.status(200).json({ success: true, data: modules });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error", error });
    }
};
exports.getActiveModules = getActiveModules;
// Update a module (Admin)
const updateModule = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await videoModule_model_1.default.findByIdAndUpdate(id, req.body, { new: true });
        if (!updated) {
            return res.status(404).json({ success: false, message: "Module not found" });
        }
        res.status(200).json({ success: true, message: "Module updated successfully", data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error", error });
    }
};
exports.updateModule = updateModule;
// Delete a module (Admin)
const deleteModule = async (req, res) => {
    try {
        const { id } = req.params;
        // Delete all videos belonging to this module
        await videoContent_model_1.default.deleteMany({ moduleId: id });
        const deleted = await videoModule_model_1.default.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Module not found" });
        }
        res.status(200).json({ success: true, message: "Module and its videos deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error", error });
    }
};
exports.deleteModule = deleteModule;
