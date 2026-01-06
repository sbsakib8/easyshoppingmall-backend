"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllReviews = exports.getPendingReviews = exports.rejectReview = exports.approveReview = exports.getProductReviews = exports.createReview = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const review_model_1 = require("./review.model");
// Create review
const createReview = async (req, res) => {
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
        const review = await review_model_1.Review.create({
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createReview = createReview;
// Get approved reviews for a product
const getProductReviews = async (req, res) => {
    try {
        const productId = req.params.productId;
        if (!mongoose_1.default.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: "Invalid product id" });
        }
        const reviews = await review_model_1.Review.find({
            productId,
            status: "approved",
        })
            .populate("userId", "name email image") // populate user name and image
            .sort({ createdAt: -1 });
        res.json({ success: true, reviews });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getProductReviews = getProductReviews;
// Approve review (admin)
const approveReview = async (req, res) => {
    try {
        const reviewId = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({ message: "Invalid review id" });
        }
        const review = await review_model_1.Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }
        review.status = "approved";
        await review.save();
        res.json({ success: true, message: "Review approved" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.approveReview = approveReview;
// Reject review (admin)
const rejectReview = async (req, res) => {
    try {
        const reviewId = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({ message: "Invalid review id" });
        }
        const review = await review_model_1.Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }
        review.status = "rejected";
        await review.save();
        res.json({ success: true, message: "Review rejected" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.rejectReview = rejectReview;
// Get pending reviews (admin)
const getPendingReviews = async (req, res) => {
    try {
        const reviews = await review_model_1.Review.find({ status: "pending" })
            .populate("userId", "name image")
            .sort({ createdAt: -1 });
        res.json({ success: true, reviews });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPendingReviews = getPendingReviews;
// Get all reviews (admin)
const getAllReviews = async (req, res) => {
    try {
        const reviews = await review_model_1.Review.find()
            .populate("userId", "name image")
            .sort({ createdAt: -1 });
        res.json({ success: true, reviews });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllReviews = getAllReviews;
