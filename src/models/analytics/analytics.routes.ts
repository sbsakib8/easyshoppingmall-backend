
import express from "express";
import {
    getCustomerAnalytics,
    getDashboardSummary,
    getProductAnalytics,
    getTrafficAnalytics
} from "./analytics.controller";
import { getDropshippingAnalytics, getMyDropshippingAnalytics } from "./dropshipping.analytics";
import { isAuth } from "../../middlewares/isAuth";
import { isDashboardAccess } from "../../middlewares/isDashboardAccess";

const router = express.Router();

// Dashboard overview summary (total + today metrics in one call)
router.get("/dashboard/summary", isAuth, isDashboardAccess("orders"), getDashboardSummary);

// All analytics endpoints can accept `startDate` and `endDate` query parameters.
// Example: /customer/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get("/customer/summary", isAuth, isDashboardAccess("customers"), getCustomerAnalytics);
router.get("/product/summary", isAuth, isDashboardAccess("products"), getProductAnalytics);
router.get("/traffic/summary", isAuth, isDashboardAccess("products"), getTrafficAnalytics);
router.get("/dropshipping/summary", isAuth, isDashboardAccess("dropshipping"), getDropshippingAnalytics);
router.get("/dropshipping/my-summary", isAuth, getMyDropshippingAnalytics);

export default router;
