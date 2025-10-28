"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const NotificationSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: ["order", "user", "stock", "system", "other"],
        default: "other",
    },
    referenceId: { type: String, default: null },
    isRead: { type: Boolean, default: false },
    meta: { type: Object, default: {} },
}, { timestamps: true });
// TTL Index: auto-delete notifications after 2 days (172800s)
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 172800 });
const Notification = (0, mongoose_1.model)("Notification", NotificationSchema);
exports.default = Notification;
