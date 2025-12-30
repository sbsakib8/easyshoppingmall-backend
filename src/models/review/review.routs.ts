import express from "express";
import { isAdmin } from "../../middlewares/isAdmin";
import { isAuth } from "../../middlewares/isAuth";
import {
    approveReview,
    createReview,
    getPendingReviews,
    getProductReviews,
    rejectReview,
} from "./review.controller";

const router = express.Router();

// Admin routes
router.get("/admin", isAuth, isAdmin, getPendingReviews);
router.patch("/admin/:id/approve", isAuth, isAdmin, approveReview);
router.patch("/admin/:id/reject", isAuth, isAdmin, rejectReview);

// User routes
router.post("/:productId", isAuth, createReview);
router.get("/:productId", getProductReviews);

export default router;
