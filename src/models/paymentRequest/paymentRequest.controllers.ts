import { Request, Response } from "express";
import PaymentRequest from "./paymentRequest.model";
import User from "../user/user.model";
import uploadCloudinary from "../../utils/cloudinary";

export const createPaymentRequest = async (req: Request, res: Response) => {
    try {
        const { amount, paymentMethod, number } = req.body;
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const requestAmount = Number(amount);
        if (isNaN(requestAmount) || requestAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid withdrawal amount" });
        }

        if (requestAmount < 200) {
            return res.status(400).json({ success: false, message: "Minimum withdrawal amount is ৳200" });
        }

        // Atomic balance deduction
        const user = await User.findOneAndUpdate(
            { _id: userId, balance: { $gte: requestAmount } },
            { $inc: { balance: -requestAmount } },
            { new: true }
        );

        if (!user) {
            return res.status(400).json({ success: false, message: "Insufficient balance or invalid user" });
        }

        try {
            const newRequest = await PaymentRequest.create({
                userId,
                amount: requestAmount,
                paymentMethod,
                number,
                status: "pending"
            });

            return res.status(201).json({
                success: true,
                message: "Withdrawal request submitted successfully",
                data: newRequest,
            });
        } catch (createError: any) {
            console.error("Payment Request Creation Error:", createError);
            // Refund balance if creation fails
            user.balance = (user.balance || 0) + requestAmount;
            await user.save();
            return res.status(500).json({ success: false, message: "Failed to create payment request: " + createError.message });
        }
    } catch (error: any) {
        console.error("Create Payment Request General Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getMyPaymentRequests = async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;
        const requests = await PaymentRequest.find({ userId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getAllPaymentRequests = async (req: Request, res: Response) => {
    try {
        const requests = await PaymentRequest.find()
            .populate("userId", "name email mobile")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const approvePaymentRequest = async (req: Request, res: Response) => {
    try {
        const { requestId } = req.params;
        const { transactionId, senderNumber, adminNote } = req.body;

        const request = await PaymentRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        if (request.status !== "pending") {
            return res.status(400).json({ success: false, message: "Request already processed" });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Payment screenshot is required for approval" });
        }

        if (!transactionId || !senderNumber) {
            return res.status(400).json({ success: false, message: "Transaction ID and Sender Number are required for approval" });
        }

        const screenshotUrl = await uploadCloudinary(req.file.buffer);

        // Manual uniqueness check for transactionId
        const existingRequest = await PaymentRequest.findOne({ transactionId });
        if (existingRequest) {
            return res.status(400).json({ success: false, message: "This Transaction ID has already been used for another payout" });
        }

        request.status = "approved";
        request.transactionId = transactionId;
        request.senderNumber = senderNumber;
        request.screenshot = screenshotUrl;
        request.adminNote = adminNote || "Payment sent successfully";
        await request.save();

        res.status(200).json({
            success: true,
            message: "Payment request approved and marked as paid",
            data: request,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const rejectPaymentRequest = async (req: Request, res: Response) => {
    try {
        const { requestId } = req.params;
        const { adminNote } = req.body;

        const request = await PaymentRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        if (request.status !== "pending") {
            return res.status(400).json({ success: false, message: "Request already processed" });
        }

        // Refund balance to user
        await User.findByIdAndUpdate(request.userId, {
            $inc: { balance: request.amount }
        });

        request.status = "rejected";
        request.adminNote = adminNote || "Withdrawal request rejected and balance refunded";
        await request.save();

        res.status(200).json({
            success: true,
            message: "Payment request rejected and balance refunded",
            data: request,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
