
import express from "express";
import {
    getCustomerAnalytics,
    getProductAnalytics
} from "./analytics.controller";

const router = express.Router();

// Defined to match the frontend's expected data structure retrieval
router.get("/customer/summary", getCustomerAnalytics);
router.get("/product/summary", getProductAnalytics);

// Legacy/Granular endpoints if needed (wrapped in the summary response now, but keeping for direct access if you want to split later)
// Currently the controller functions return the big consolidated objects.

export default router;
