"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const paymentRequest_controllers_1 = require("./paymentRequest.controllers");
const isAuth_1 = require("../../middlewares/isAuth");
const isAdmin_1 = require("../../middlewares/isAdmin");
const multer_1 = require("../../middlewares/multer");
const router = express_1.default.Router();
// User routes
router.post("/create", isAuth_1.isAuth, paymentRequest_controllers_1.createPaymentRequest); // No screenshot needed for user request
router.get("/my-requests", isAuth_1.isAuth, paymentRequest_controllers_1.getMyPaymentRequests);
// Admin routes
router.get("/all", isAuth_1.isAuth, isAdmin_1.isAdmin, paymentRequest_controllers_1.getAllPaymentRequests);
router.patch("/approve/:requestId", isAuth_1.isAuth, isAdmin_1.isAdmin, multer_1.upload.single("screenshot"), paymentRequest_controllers_1.approvePaymentRequest); // Screenshot provided by admin
router.patch("/reject/:requestId", isAuth_1.isAuth, isAdmin_1.isAdmin, paymentRequest_controllers_1.rejectPaymentRequest);
exports.default = router;
