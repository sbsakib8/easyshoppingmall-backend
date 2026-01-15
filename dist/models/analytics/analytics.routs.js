"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const analytics_controller_1 = require("./analytics.controller");
const router = express_1.default.Router();
// Defined to match the frontend's expected data structure retrieval
router.get("/customer/summary", analytics_controller_1.getCustomerAnalytics);
router.get("/product/summary", analytics_controller_1.getProductAnalytics);
// Legacy/Granular endpoints if needed (wrapped in the summary response now, but keeping for direct access if you want to split later)
// Currently the controller functions return the big consolidated objects.
exports.default = router;
