import express from "express";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";
import { isDashboardAccess } from "../../middlewares/isDashboardAccess";
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

// Admin / Manager routes (dropshipping manage video)
router.get("/all", isAuth, isDashboardAccess("dropshipping"), adminGetAllVideoRequests);
router.patch("/update/:requestId", isAuth, isDashboardAccess("dropshipping"), adminUpdateVideoRequestStatus);

export default router;
