"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminUpdateVideoRequestStatus = exports.adminGetAllVideoRequests = exports.getMyVideoRequests = exports.createVideoRequest = void 0;
const videoRequest_model_1 = __importDefault(require("./videoRequest.model"));
const createVideoRequest = async (req, res) => {
    try {
        const { productId, videoType, notes } = req.body;
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        if (!productId) {
            return res.status(400).json({ success: false, message: "Product ID is required" });
        }
        const newRequest = await videoRequest_model_1.default.create({
            userId,
            productId,
            videoType,
            notes,
            status: "pending"
        });
        res.status(201).json({
            success: true,
            message: "Custom video request submitted successfully",
            data: newRequest
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createVideoRequest = createVideoRequest;
const getMyVideoRequests = async (req, res) => {
    try {
        const userId = req.user?._id;
        const requests = await videoRequest_model_1.default.find({ userId })
            .populate("productId", "productName images price")
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: requests
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMyVideoRequests = getMyVideoRequests;
// Admin Controllers
const adminGetAllVideoRequests = async (req, res) => {
    try {
        const requests = await videoRequest_model_1.default.find()
            .populate("userId", "name email mobile")
            .populate("productId", "productName images price")
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: requests
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.adminGetAllVideoRequests = adminGetAllVideoRequests;
const adminUpdateVideoRequestStatus = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status, deliveredVideoUrl, adminNote } = req.body;
        if (!["pending", "approved", "completed", "rejected"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }
        const request = await videoRequest_model_1.default.findById(requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }
        if (status)
            request.status = status;
        if (deliveredVideoUrl !== undefined)
            request.deliveredVideoUrl = deliveredVideoUrl;
        if (adminNote !== undefined)
            request.adminNote = adminNote;
        await request.save();
        res.status(200).json({
            success: true,
            message: "Request updated successfully",
            data: request
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.adminUpdateVideoRequestStatus = adminUpdateVideoRequestStatus;
