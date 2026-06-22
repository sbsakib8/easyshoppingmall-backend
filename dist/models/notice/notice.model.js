"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const NoticeSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    keyPoints: {
        type: [String],
        default: [],
    },
    button: {
        text: {
            type: String,
            default: null,
        },
        color: {
            type: String,
            default: "#1976d2",
        },
        url: {
            type: String,
            default: null,
        },
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    priority: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });
// Index for active notices sorted by priority
NoticeSchema.index({ isActive: 1, priority: -1 });
const Notice = (0, mongoose_1.model)("Notice", NoticeSchema);
exports.default = Notice;
