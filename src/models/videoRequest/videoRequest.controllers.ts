import { Request, Response } from "express";
import VideoRequest from "./videoRequest.model";

export const createVideoRequest = async (req: Request, res: Response) => {
    try {
        const { productId, videoType, notes } = req.body;
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!productId) {
            return res.status(400).json({ success: false, message: "Product ID is required" });
        }

        const newRequest = await VideoRequest.create({
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
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getMyVideoRequests = async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;
        const requests = await VideoRequest.find({ userId })
            .populate("productId", "productName images price")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin Controllers
export const adminGetAllVideoRequests = async (req: Request, res: Response) => {
    try {
        const requests = await VideoRequest.find()
            .populate("userId", "name email mobile")
            .populate("productId", "productName images price")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const adminUpdateVideoRequestStatus = async (req: Request, res: Response) => {
    try {
        const { requestId } = req.params;
        const { status, deliveredVideoUrl, adminNote } = req.body;

        if (!["pending", "approved", "completed", "rejected"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const request = await VideoRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        if (status) request.status = status;
        if (deliveredVideoUrl !== undefined) request.deliveredVideoUrl = deliveredVideoUrl;
        if (adminNote !== undefined) request.adminNote = adminNote;

        await request.save();

        res.status(200).json({
            success: true,
            message: "Request updated successfully",
            data: request
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
