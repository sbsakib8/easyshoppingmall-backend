"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVideoAccessStatus = exports.getAllVideoAccessRequests = exports.getMyVideoAccess = exports.createVideoAccessRequest = void 0;
const videoAccess_model_1 = __importDefault(require("./videoAccess.model"));
const createVideoAccessRequest = async (req, res) => {
    try {
        const { amount, paymentMethod, transactionId, senderNumber, videoType } = req.body;
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        // Check if user already has a pending or approved request for this videoType
        const existingRequest = await videoAccess_model_1.default.findOne({ userId, videoType, status: { $in: ["pending", "approved"] } });
        if (existingRequest) {
            if (existingRequest.status === "approved") {
                return res.status(400).json({ success: false, message: "You already have access to this video" });
            }
            return res.status(400).json({ success: false, message: "Your previous request is still pending" });
        }
        // Check if transactionId is unique
        const duplicateTx = await videoAccess_model_1.default.findOne({ transactionId });
        if (duplicateTx) {
            return res.status(400).json({ success: false, message: "Transaction ID already exists" });
        }
        const newRequest = await videoAccess_model_1.default.create({
            userId,
            amount,
            paymentMethod,
            transactionId,
            senderNumber,
            videoType: videoType || "paid_training",
            status: "pending"
        });
        res.status(201).json({
            success: true,
            message: "Access request submitted. Waiting for admin approval.",
            data: newRequest
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createVideoAccessRequest = createVideoAccessRequest;
const getMyVideoAccess = async (req, res) => {
    try {
        const userId = req.user?._id;
        const access = await videoAccess_model_1.default.find({ userId });
        res.status(200).json({
            success: true,
            data: access
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMyVideoAccess = getMyVideoAccess;
// Admin Controllers
const getAllVideoAccessRequests = async (req, res) => {
    try {
        const requests = await videoAccess_model_1.default.find()
            .populate("userId", "name email mobile")
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
exports.getAllVideoAccessRequests = getAllVideoAccessRequests;
const updateVideoAccessStatus = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status, adminNote } = req.body;
        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }
        const request = await videoAccess_model_1.default.findById(requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }
        request.status = status;
        request.adminNote = adminNote || `Request ${status} by admin`;
        await request.save();
        res.status(200).json({
            success: true,
            message: `Request ${status} successfully`,
            data: request
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateVideoAccessStatus = updateVideoAccessStatus;
