import express from "express";
import { isAdmin } from "../../middlewares/isAdmin";
import { isAuth } from "../../middlewares/isAuth";
import {
    approveReview,
    createReview,
    getPendingReviews,
    getProductReviews,
    rejectReview,
    getAllReviews, // Import the new controller
} from "./review.controller";

const router = express.Router();

// Admin routes
router.get("/admin", isAuth, isAdmin, getPendingReviews);
router.get("/admin/all", isAuth, isAdmin, getAllReviews); // New route for all reviews
router.patch("/admin/:id/approve", isAuth, isAdmin, approveReview);
router.patch("/admin/:id/reject", isAuth, isAdmin, rejectReview);

// User routes
router.post("/:productId", isAuth, createReview);
router.get("/:productId", getProductReviews);

export default router;
