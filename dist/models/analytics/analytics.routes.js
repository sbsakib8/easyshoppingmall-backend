"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const analytics_controller_1 = require("./analytics.controller");
const dropshipping_analytics_1 = require("./dropshipping.analytics");
const isAuth_1 = require("../../middlewares/isAuth");
const isAdmin_1 = require("../../middlewares/isAdmin");
const router = express_1.default.Router();
// All analytics endpoints can accept `startDate` and `endDate` query parameters.
// Example: /customer/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get("/customer/summary", isAuth_1.isAuth, isAdmin_1.isAdmin, analytics_controller_1.getCustomerAnalytics);
router.get("/product/summary", isAuth_1.isAuth, isAdmin_1.isAdmin, analytics_controller_1.getProductAnalytics);
router.get("/traffic/summary", isAuth_1.isAuth, isAdmin_1.isAdmin, analytics_controller_1.getTrafficAnalytics);
router.get("/dropshipping/summary", isAuth_1.isAuth, isAdmin_1.isAdmin, dropshipping_analytics_1.getDropshippingAnalytics);
router.get("/dropshipping/my-summary", isAuth_1.isAuth, dropshipping_analytics_1.getMyDropshippingAnalytics);
// Legacy/Granular endpoints if needed (wrapped in the summary response now, but keeping for direct access if you want to split later)
// Currently the controller functions return the big consolidated objects.
exports.default = router;
