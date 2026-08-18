import express from "express";
import { 
    createPaymentRequest, 
    getMyPaymentRequests, 
    getAllPaymentRequests, 
    approvePaymentRequest, 
    rejectPaymentRequest 
} from "./paymentRequest.controllers";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";
import { upload } from "../../middlewares/multer";

const router = express.Router();

// User routes
router.post("/create", isAuth, createPaymentRequest); // No screenshot needed for user request
router.get("/my-requests", isAuth, getMyPaymentRequests);

// Admin routes
router.get("/all", isAuth, isAdmin, getAllPaymentRequests);
router.patch("/approve/:requestId", isAuth, isAdmin, upload.single("screenshot"), approvePaymentRequest); // Screenshot provided by admin
router.patch("/reject/:requestId", isAuth, isAdmin, rejectPaymentRequest);

export default router;
