import { Request, Response } from "express";
import mongoose from "mongoose";
import { Review } from "./review.model";

// Create review
export const createReview = async (req: Request, res: Response) => {
    try {
        const { rating, comment } = req.body;
        const productId = req.params.productId;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!rating || !comment) {
            return res.status(400).json({ message: "Rating & comment required" });
        }

        const review = await Review.create({
            userId,
            productId,
            rating,
            comment,
            status: "pending",
        });

        res.status(201).json({
            success: true,
            message: "Review submitted for approval",
            review,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get approved reviews for a product
export const getProductReviews = async (req: Request, res: Response) => {
    try {
        const productId = req.params.productId;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: "Invalid product id" });
        }

        const reviews = await Review.find({
            productId,
            status: "approved",
        })
            .populate("userId", "name email image") // populate user name and image
            .sort({ createdAt: -1 });

        res.json({ success: true, reviews });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Approve review (admin)
export const approveReview = async (req: Request, res: Response) => {
    try {
        const reviewId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({ message: "Invalid review id" });
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        review.status = "approved";
        await review.save();

        res.json({ success: true, message: "Review approved" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Reject review (admin)
export const rejectReview = async (req: Request, res: Response) => {
    try {
        const reviewId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({ message: "Invalid review id" });
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        review.status = "rejected";
        await review.save();

        res.json({ success: true, message: "Review rejected" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get pending reviews (admin)
export const getPendingReviews = async (req: Request, res: Response) => {
    try {
        const reviews = await Review.find({ status: "pending" })
            .populate("userId", "name image")
            .sort({ createdAt: -1 });

        res.json({ success: true, reviews });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all reviews (admin)
export const getAllReviews = async (req: Request, res: Response) => {
    try {
        const reviews = await Review.find()
            .populate("userId", "name image")
            .sort({ createdAt: -1 });

        res.json({ success: true, reviews });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
