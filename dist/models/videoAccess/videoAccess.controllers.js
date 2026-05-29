"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVideoAccessStatus = exports.getAllVideoAccessRequests = exports.getMyVideoAccess = exports.createVideoAccessRequest = void 0;
const videoAccess_model_1 = __importDefault(require("./videoAccess.model"));
const user_model_1 = __importDefault(require("../user/user.model"));
const videoCourse_model_1 = __importDefault(require("../videoCourse/videoCourse.model"));
const createVideoAccessRequest = async (req, res) => {
    try {
        const { amount, paymentMethod, transactionId, senderNumber, videoType, courseId, referralCode } = req.body;
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        // Check if user already has a pending or approved request for this courseId/videoType
        const duplicateQuery = { userId, status: { $in: ["pending", "approved"] } };
        if (courseId) {
            duplicateQuery.courseId = courseId;
        }
        else {
            duplicateQuery.videoType = videoType || "paid_training";
        }
        const existingRequest = await videoAccess_model_1.default.findOne(duplicateQuery);
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
        let referredById = null;
        if (referralCode) {
            const referrer = await user_model_1.default.findOne({ referralCode: { $regex: new RegExp(`^${referralCode}$`, 'i') } });
            if (referrer) {
                referredById = referrer._id;
            }
        }
        if (!referredById) {
            const buyer = await user_model_1.default.findById(userId);
            if (buyer && buyer.referredBy) {
                referredById = buyer.referredBy;
            }
        }
        const newRequest = await videoAccess_model_1.default.create({
            userId,
            courseId: courseId || null,
            amount,
            paymentMethod,
            transactionId,
            senderNumber,
            videoType: videoType || "paid_training",
            status: "pending",
            referredBy: referredById
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
            .populate("courseId", "title price discountPrice")
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
        const oldStatus = request.status;
        request.status = status;
        request.adminNote = adminNote || `Request ${status} by admin`;
        await request.save();
        if (status === "approved" && oldStatus !== "approved") {
            const user = await user_model_1.default.findById(request.userId);
            if (user) {
                const referrerId = request.referredBy || user.referredBy;
                if (referrerId) {
                    const referrer = await user_model_1.default.findById(referrerId);
                    if (referrer) {
                        let bonusAmount = 0;
                        if (request.courseId) {
                            const course = await videoCourse_model_1.default.findById(request.courseId);
                            if (course && course.referralBonus) {
                                bonusAmount = course.referralBonus;
                            }
                        }
                        if (bonusAmount > 0) {
                            referrer.balance = (referrer.balance || 0) + bonusAmount;
                            await referrer.save();
                            console.log(`[Referral Bonus] Added ${bonusAmount} to referrer ${referrer._id} for course ${request.courseId} purchased by ${user._id}`);
                        }
                    }
                }
            }
        }
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
