"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleNoticeStatus = exports.deleteNotice = exports.updateNotice = exports.getNoticeById = exports.getActiveNotices = exports.getAllNoticesAdmin = exports.createNotice = void 0;
const notice_model_1 = __importDefault(require("./notice.model"));
const cache_1 = require("../../utils/cache");
const revalidate_1 = require("../../utils/revalidate");
/**
 * @desc Create a new notice (Admin only)
 * @route POST /api/notice
 * @access Private (Admin)
 */
const createNotice = async (req, res) => {
    try {
        const { title, description, keyPoints, button, isActive, priority } = req.body;
        if (!title || !description) {
            res.status(400).json({
                success: false,
                message: "Title and description are required",
            });
            return;
        }
        // Validate button color format if provided
        if (button?.color && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(button.color)) {
            res.status(400).json({
                success: false,
                message: "Invalid button color format. Use hex color (e.g., #1976d2)",
            });
            return;
        }
        // Validate button URL format if provided
        if (button?.url && !/^https?:\/\/.+/.test(button.url)) {
            res.status(400).json({
                success: false,
                message: "Invalid button URL format. Must start with http:// or https://",
            });
            return;
        }
        const notice = await notice_model_1.default.create({
            title,
            description,
            keyPoints: Array.isArray(keyPoints) ? keyPoints : [],
            button: {
                text: button?.text || null,
                color: button?.color || "#1976d2",
                url: button?.url || null,
            },
            isActive: isActive !== undefined ? isActive : true,
            priority: priority || 0,
        });
        await cache_1.cache.del("notices:active");
        await cache_1.cache.delByPrefix("homepage");
        await (0, revalidate_1.revalidateFrontend)();
        res.status(201).json({
            success: true,
            message: "Notice created successfully",
            data: notice,
        });
    }
    catch (error) {
        console.error("Create Notice Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
exports.createNotice = createNotice;
/**
 * @desc Get all notices (Admin - includes inactive)
 * @route GET /api/notice/admin/all
 * @access Private (Admin)
 */
const getAllNoticesAdmin = async (req, res) => {
    try {
        const notices = await notice_model_1.default.find()
            .sort({ priority: -1, createdAt: -1 })
            .lean();
        res.status(200).json({
            success: true,
            data: notices,
        });
    }
    catch (error) {
        console.error("Get All Notices Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
exports.getAllNoticesAdmin = getAllNoticesAdmin;
/**
 * @desc Get active notices (Public - for dropshipping user overview)
 * @route GET /api/notice/active
 * @access Public
 */
const getActiveNotices = async (req, res) => {
    try {
        const cacheKey = "notices:active";
        const cached = await cache_1.cache.get(cacheKey);
        if (cached) {
            res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
            res.status(200).json(cached);
            return;
        }
        const notices = await notice_model_1.default.find({ isActive: true })
            .sort({ priority: -1, createdAt: -1 })
            .lean();
        const response = { success: true, data: notices };
        await cache_1.cache.set(cacheKey, response, 300);
        res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
        res.status(200).json(response);
    }
    catch (error) {
        console.error("Get Active Notices Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
exports.getActiveNotices = getActiveNotices;
/**
 * @desc Get single notice by ID
 * @route GET /api/notice/:id
 * @access Private (Admin)
 */
const getNoticeById = async (req, res) => {
    try {
        const { id } = req.params;
        const notice = await notice_model_1.default.findById(id).lean();
        if (!notice) {
            res.status(404).json({
                success: false,
                message: "Notice not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: notice,
        });
    }
    catch (error) {
        console.error("Get Notice Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
exports.getNoticeById = getNoticeById;
/**
 * @desc Update a notice (Admin only)
 * @route PUT /api/notice/:id
 * @access Private (Admin)
 */
const updateNotice = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, keyPoints, button, isActive, priority } = req.body;
        const notice = await notice_model_1.default.findById(id);
        if (!notice) {
            res.status(404).json({
                success: false,
                message: "Notice not found",
            });
            return;
        }
        // Validate button color format if provided
        if (button?.color && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(button.color)) {
            res.status(400).json({
                success: false,
                message: "Invalid button color format. Use hex color (e.g., #1976d2)",
            });
            return;
        }
        // Validate button URL format if provided
        if (button?.url && !/^https?:\/\/.+/.test(button.url)) {
            res.status(400).json({
                success: false,
                message: "Invalid button URL format. Must start with http:// or https://",
            });
            return;
        }
        // Update fields
        if (title !== undefined)
            notice.title = title;
        if (description !== undefined)
            notice.description = description;
        if (keyPoints !== undefined)
            notice.keyPoints = Array.isArray(keyPoints) ? keyPoints : [];
        if (button !== undefined) {
            notice.button = {
                text: button.text !== undefined ? button.text : notice.button?.text,
                color: button.color !== undefined ? button.color : notice.button?.color || "#1976d2",
                url: button.url !== undefined ? button.url : notice.button?.url,
            };
        }
        if (isActive !== undefined)
            notice.isActive = isActive;
        if (priority !== undefined)
            notice.priority = priority;
        await notice.save();
        await cache_1.cache.del("notices:active");
        await cache_1.cache.delByPrefix("homepage");
        res.status(201).json({
            success: true,
            message: "Notice created successfully",
            data: notice,
        });
    }
    catch (error) {
        console.error("Update Notice Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
exports.updateNotice = updateNotice;
/**
 * @desc Delete a notice (Admin only)
 * @route DELETE /api/notice/:id
 * @access Private (Admin)
 */
const deleteNotice = async (req, res) => {
    try {
        const { id } = req.params;
        const notice = await notice_model_1.default.findByIdAndDelete(id);
        if (!notice) {
            res.status(404).json({
                success: false,
                message: "Notice not found",
            });
            return;
        }
        await cache_1.cache.del("notices:active");
        await cache_1.cache.delByPrefix("homepage");
        res.status(200).json({
            success: true,
            message: "Notice deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete Notice Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
exports.deleteNotice = deleteNotice;
/**
 * @desc Toggle notice active status (Admin only)
 * @route PATCH /api/notice/:id/toggle
 * @access Private (Admin)
 */
const toggleNoticeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const notice = await notice_model_1.default.findById(id);
        if (!notice) {
            res.status(404).json({
                success: false,
                message: "Notice not found",
            });
            return;
        }
        notice.isActive = !notice.isActive;
        await notice.save();
        await cache_1.cache.del("notices:active");
        await cache_1.cache.delByPrefix("homepage");
        res.status(200).json({
            success: true,
            message: "Notice updated successfully",
            data: notice,
        });
    }
    catch (error) {
        console.error("Toggle Notice Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
exports.toggleNoticeStatus = toggleNoticeStatus;
