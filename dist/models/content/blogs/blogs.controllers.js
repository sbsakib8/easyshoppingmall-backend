"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBlog = exports.updateBlog = exports.getBlogById = exports.getAllBlogs = exports.createBlog = void 0;
const blogs_model_1 = __importDefault(require("./blogs.model"));
const moment_1 = __importDefault(require("moment"));
require("moment/locale/bn");
const cloudinary_1 = __importDefault(require("../../../utils/cloudinary"));
const createBlog = async (req, res) => {
    try {
        const { title, author, category, status, excerpt, content } = req.body;
        const now = (0, moment_1.default)().locale("bn");
        const file = req.file?.path;
        let image = "";
        if (file) {
            image = await (0, cloudinary_1.default)(file);
        }
        const blog = new blogs_model_1.default({
            title,
            author,
            category,
            status,
            image,
            excerpt,
            content,
            createdDateBn: now.format("DD MMMM, YYYY"),
            createdTimeBn: now.format("hh:mm A"),
        });
        const savedBlog = await blog.save();
        res.status(201).json({
            success: true,
            message: "Blog created successfully",
            data: savedBlog,
        });
    }
    catch (error) {
        console.error("Create Blog Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.createBlog = createBlog;
//  Get All Blogs
const getAllBlogs = async (_req, res) => {
    try {
        const blogs = await blogs_model_1.default.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: blogs });
    }
    catch (error) {
        console.error("Get Blogs Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getAllBlogs = getAllBlogs;
// Get Single Blog
const getBlogById = async (req, res) => {
    try {
        const blog = await blogs_model_1.default.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ success: false, message: "Blog not found" });
        }
        res.status(200).json({ success: true, data: blog });
    }
    catch (error) {
        console.error("Get Blog Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getBlogById = getBlogById;
//  Update Blog
const updateBlog = async (req, res) => {
    try {
        const now = (0, moment_1.default)().locale("bn");
        const file = req.file?.path;
        let image = req.body.image || "";
        if (file) {
            image = await (0, cloudinary_1.default)(file);
        }
        const updateData = {
            ...req.body,
            image,
            updatedDateBn: now.format("DD MMMM, YYYY"),
            updatedTimeBn: now.format("hh:mm A"),
        };
        const updatedBlog = await blogs_model_1.default.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
        });
        if (!updatedBlog) {
            return res.status(404).json({ success: false, message: "Blog not found" });
        }
        res.status(200).json({ success: true, message: "Blog updated", data: updatedBlog });
    }
    catch (error) {
        console.error("Update Blog Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.updateBlog = updateBlog;
//  Delete Blog
const deleteBlog = async (req, res) => {
    try {
        const deletedBlog = await blogs_model_1.default.findByIdAndDelete(req.params.id);
        if (!deletedBlog) {
            return res.status(404).json({ success: false, message: "Blog not found" });
        }
        res.status(200).json({ success: true, message: "Blog deleted successfully" });
    }
    catch (error) {
        console.error("Delete Blog Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.deleteBlog = deleteBlog;
