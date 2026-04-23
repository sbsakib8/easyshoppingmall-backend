"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const isAdmin_1 = require("../../middlewares/isAdmin");
const isAuth_1 = require("../../middlewares/isAuth");
const review_controller_1 = require("./review.controller");
const router = express_1.default.Router();
// Admin routes
router.get("/admin", isAuth_1.isAuth, isAdmin_1.isAdmin, review_controller_1.getPendingReviews);
router.get("/admin/all", isAuth_1.isAuth, isAdmin_1.isAdmin, review_controller_1.getAllReviews);
router.patch("/admin/:id/approve", isAuth_1.isAuth, isAdmin_1.isAdmin, review_controller_1.approveReview);
router.patch("/admin/:id/reject", isAuth_1.isAuth, isAdmin_1.isAdmin, review_controller_1.rejectReview);
// User routes
router.post("/:productId", isAuth_1.isAuth, review_controller_1.createReview);
router.get("/:productId", review_controller_1.getProductReviews);
router.delete("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, review_controller_1.deleteReview);
exports.default = router;
