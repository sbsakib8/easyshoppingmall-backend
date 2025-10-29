"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getNotifications = exports.createNotification = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const notification_model_1 = __importDefault(require("./notification.model"));
// createNotification notification 
exports.createNotification = (0, express_async_handler_1.default)(async (req, res) => {
    const { title, message, type, referenceId, meta } = req.body;
    if (!title || !message || !referenceId) {
        res.status(400);
        throw new Error("title, message & referenceId are required");
    }
    // ✅ Prevent sending duplicate notifications
    const exists = await notification_model_1.default.findOne({ referenceId });
    if (exists) {
        res.status(200).json({
            success: false,
            message: "Notification already sent for this product",
        });
        return; // ✅ MUST HAVE! Stop execution here
    }
    // ✅ Create Notification
    const notif = await notification_model_1.default.create({
        title,
        message,
        type,
        referenceId,
        meta,
    });
    // ✅ Emit socket instantly
    const io = req.app?.get("io");
    if (io)
        io.emit("notification:new", notif);
    res.status(201).json({
        success: true,
        data: notif,
    });
});
// getNotifications notification 
exports.getNotifications = (0, express_async_handler_1.default)(async (req, res) => {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "30", 10);
    const unreadOnly = req.query.unreadOnly === "true";
    const filter = unreadOnly ? { isRead: false } : {};
    const total = await notification_model_1.default.countDocuments(filter);
    const data = await notification_model_1.default.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
    res.json({
        success: true,
        total,
        page,
        limit,
        data,
    });
});
/// markAsRead notification 
exports.markAsRead = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    const notif = await notification_model_1.default.findByIdAndUpdate(id, { isRead: true }, { new: true });
    if (!notif) {
        res.status(404);
        throw new Error("Notification not found");
    }
    res.json({ success: true, data: notif });
});
// markAllAsRead notification 
exports.markAllAsRead = (0, express_async_handler_1.default)(async (req, res) => {
    await notification_model_1.default.updateMany({ isRead: false }, { isRead: true });
    res.json({ success: true });
});
// Delete notification 
exports.deleteNotification = (0, express_async_handler_1.default)(async (req, res) => {
    const notif = await notification_model_1.default.findByIdAndDelete(req.params.id);
    if (!notif) {
        res.status(404);
        throw new Error("Notification not found");
    }
    res.json({ success: true });
});
