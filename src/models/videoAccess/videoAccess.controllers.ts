import { Request, Response } from "express";
import VideoAccess from "./videoAccess.model";
import User from "../user/user.model";

export const createVideoAccessRequest = async (req: Request, res: Response) => {
    try {
        const { amount, paymentMethod, transactionId, senderNumber, videoType } = req.body;
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Check if user already has a pending or approved request for this videoType
        const existingRequest = await VideoAccess.findOne({ userId, videoType, status: { $in: ["pending", "approved"] } });
        if (existingRequest) {
            if (existingRequest.status === "approved") {
                return res.status(400).json({ success: false, message: "You already have access to this video" });
            }
            return res.status(400).json({ success: false, message: "Your previous request is still pending" });
        }

        // Check if transactionId is unique
        const duplicateTx = await VideoAccess.findOne({ transactionId });
        if (duplicateTx) {
            return res.status(400).json({ success: false, message: "Transaction ID already exists" });
        }

        const newRequest = await VideoAccess.create({
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
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getMyVideoAccess = async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;
        const access = await VideoAccess.find({ userId });

        res.status(200).json({
            success: true,
            data: access
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin Controllers
export const getAllVideoAccessRequests = async (req: Request, res: Response) => {
    try {
        const requests = await VideoAccess.find()
            .populate("userId", "name email mobile")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateVideoAccessStatus = async (req: Request, res: Response) => {
    try {
        const { requestId } = req.params;
        const { status, adminNote } = req.body;

        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const request = await VideoAccess.findById(requestId);
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
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
