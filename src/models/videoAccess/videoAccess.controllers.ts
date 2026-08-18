import { Request, Response } from "express";
import VideoAccess from "./videoAccess.model";
import User from "../user/user.model";
import VideoCourse from "../videoCourse/videoCourse.model";

export const createVideoAccessRequest = async (req: Request, res: Response) => {
    try {
        const { amount, paymentMethod, transactionId, senderNumber, videoType, courseId, referralCode } = req.body;
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Check if user already has a pending or approved request for this courseId/videoType
        const duplicateQuery: any = { userId, status: { $in: ["pending", "approved"] } };
        if (courseId) {
            duplicateQuery.courseId = courseId;
        } else {
            duplicateQuery.videoType = videoType || "paid_training";
        }

        const existingRequest = await VideoAccess.findOne(duplicateQuery);
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

        let referredById = null;
        if (referralCode) {
            const referrer = await User.findOne({ referralCode: { $regex: new RegExp(`^${referralCode}$`, 'i') } });
            if (referrer) {
                referredById = referrer._id;
            }
        }

        if (!referredById) {
            const buyer = await User.findById(userId);
            if (buyer && buyer.referredBy) {
                referredById = buyer.referredBy;
            }
        }

        const newRequest = await VideoAccess.create({
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
            .populate("courseId", "title price discountPrice")
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

        const oldStatus = request.status;
        request.status = status;
        request.adminNote = adminNote || `Request ${status} by admin`;
        await request.save();

        if (status === "approved" && oldStatus !== "approved") {
            const user = await User.findById(request.userId);
            if (user) {
                const referrerId = request.referredBy || user.referredBy;
                if (referrerId) {
                    const referrer = await User.findById(referrerId);
                    if (referrer) {
                        let bonusAmount = 0;
                        if (request.courseId) {
                            const course = await VideoCourse.findById(request.courseId);
                            if (course && course.referralBonus) {
                                bonusAmount = course.referralBonus;
                            }
                        }
                        if (bonusAmount > 0) {
                            referrer.balance = (referrer.balance || 0) + bonusAmount;
                            await referrer.save();
                            // ✅ Mark bonus as credited so repair script won't double-credit
                            request.referralBonusCredited = true;
                            await request.save();
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
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc  Backfill missing video referral bonuses for approved requests that were never credited.
 *        Safe to run multiple times — only credits records where referralBonusCredited is NOT true.
 * @route POST /api/video-access/repair-referral-bonuses
 * @access Private (Admin)
 */
export const repairVideoReferralBalances = async (req: Request, res: Response) => {
    try {
        // Find all approved requests with a referrer that were NOT yet credited
        const unpaidRequests = await VideoAccess.find({
            status: "approved",
            referredBy: { $ne: null },
            referralBonusCredited: { $ne: true },
            courseId: { $ne: null },
        }).populate("courseId", "title referralBonus");

        let credited = 0;
        let skipped = 0;
        const results: any[] = [];

        for (const request of unpaidRequests) {
            const course: any = request.courseId;
            const bonusAmount = course?.referralBonus || 0;

            if (!bonusAmount || bonusAmount <= 0) {
                skipped++;
                results.push({
                    requestId: request._id,
                    status: "skipped",
                    reason: "No referral bonus configured for course",
                });
                continue;
            }

            const referrer = await User.findById(request.referredBy);
            if (!referrer) {
                skipped++;
                results.push({
                    requestId: request._id,
                    status: "skipped",
                    reason: "Referrer user not found",
                });
                continue;
            }

            // Credit the balance
            referrer.balance = (referrer.balance || 0) + bonusAmount;
            await referrer.save();

            // Mark as credited
            request.referralBonusCredited = true;
            await request.save();

            credited++;
            results.push({
                requestId: request._id,
                referrerId: referrer._id,
                referrerName: referrer.name,
                bonusAmount,
                newBalance: referrer.balance,
                status: "credited",
            });

            console.log(`[Repair] Credited ${bonusAmount} to ${referrer.name} (${referrer._id}) for request ${request._id}`);
        }

        res.status(200).json({
            success: true,
            message: `Repair complete. Credited: ${credited}, Skipped: ${skipped}`,
            data: { credited, skipped, results },
        });
    } catch (error: any) {
        console.error("[Repair Error]", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
