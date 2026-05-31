import express from "express";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";
import { 
    createVideoRequest, 
    getMyVideoRequests, 
    adminGetAllVideoRequests, 
    adminUpdateVideoRequestStatus 
} from "./videoRequest.controllers";

const router = express.Router();

// User routes
router.post("/create", isAuth, createVideoRequest);
router.get("/my-requests", isAuth, getMyVideoRequests);

// Admin routes
router.get("/all", isAuth, isAdmin, adminGetAllVideoRequests);
router.patch("/update/:requestId", isAuth, isAdmin, adminUpdateVideoRequestStatus);

export default router;
