"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const analytics_controller_1 = require("./analytics.controller");
const dropshipping_analytics_1 = require("./dropshipping.analytics");
const isAuth_1 = require("../../middlewares/isAuth");
const isDashboardAccess_1 = require("../../middlewares/isDashboardAccess");
const router = express_1.default.Router();
// Dashboard overview summary (total + today metrics in one call)
router.get("/dashboard/summary", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("orders"), analytics_controller_1.getDashboardSummary);
// All analytics endpoints can accept `startDate` and `endDate` query parameters.
// Example: /customer/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get("/customer/summary", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("customers"), analytics_controller_1.getCustomerAnalytics);
router.get("/product/summary", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("products"), analytics_controller_1.getProductAnalytics);
router.get("/traffic/summary", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("products"), analytics_controller_1.getTrafficAnalytics);
router.get("/dropshipping/summary", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("dropshipping"), dropshipping_analytics_1.getDropshippingAnalytics);
router.get("/dropshipping/my-summary", isAuth_1.isAuth, dropshipping_analytics_1.getMyDropshippingAnalytics);
exports.default = router;
