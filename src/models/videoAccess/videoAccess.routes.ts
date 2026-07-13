import express from "express";
import { 
    createVideoAccessRequest, 
    getMyVideoAccess, 
    getAllVideoAccessRequests, 
    updateVideoAccessStatus 
} from "./videoAccess.controllers";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";
import { isDashboardAccess } from "../../middlewares/isDashboardAccess";

const router = express.Router();

router.post("/create", isAuth, createVideoAccessRequest);
router.get("/my-access", isAuth, getMyVideoAccess);

// Admin / Manager routes (dropshipping manage video)
router.get("/all", isAuth, isDashboardAccess("dropshipping"), getAllVideoAccessRequests);
router.patch("/update/:requestId", isAuth, isDashboardAccess("dropshipping"), updateVideoAccessStatus);

export default router;
