
import express from "express";
import {
    getCustomerAnalytics,
    getProductAnalytics,
    getTrafficAnalytics
} from "./analytics.controller";

const router = express.Router();

// All analytics endpoints can accept `startDate` and `endDate` query parameters.
// Example: /customer/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get("/customer/summary", getCustomerAnalytics);
router.get("/product/summary", getProductAnalytics);
router.get("/traffic/summary", getTrafficAnalytics);

// Legacy/Granular endpoints if needed (wrapped in the summary response now, but keeping for direct access if you want to split later)
// Currently the controller functions return the big consolidated objects.

export default router;
