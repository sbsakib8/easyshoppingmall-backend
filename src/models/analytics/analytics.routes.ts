
import express from "express";
import {
    getCustomerAnalytics,
    getProductAnalytics,
    getTrafficAnalytics
} from "./analytics.controller";
import { getDropshippingAnalytics, getMyDropshippingAnalytics } from "./dropshipping.analytics";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";

const router = express.Router();

// All analytics endpoints can accept `startDate` and `endDate` query parameters.
// Example: /customer/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get("/customer/summary", isAuth, isAdmin, getCustomerAnalytics);
router.get("/product/summary", isAuth, isAdmin, getProductAnalytics);
router.get("/traffic/summary", isAuth, isAdmin, getTrafficAnalytics);
router.get("/dropshipping/summary", isAuth, isAdmin, getDropshippingAnalytics);
router.get("/dropshipping/my-summary", isAuth, getMyDropshippingAnalytics);

// Legacy/Granular endpoints if needed (wrapped in the summary response now, but keeping for direct access if you want to split later)
// Currently the controller functions return the big consolidated objects.

export default router;
