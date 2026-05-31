import express from "express";
import { 
    createVideoAccessRequest, 
    getMyVideoAccess, 
    getAllVideoAccessRequests, 
    updateVideoAccessStatus 
} from "./videoAccess.controllers";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";

const router = express.Router();

router.post("/create", isAuth, createVideoAccessRequest);
router.get("/my-access", isAuth, getMyVideoAccess);

// Admin routes
router.get("/all", isAuth, isAdmin, getAllVideoAccessRequests);
router.patch("/update/:requestId", isAuth, isAdmin, updateVideoAccessStatus);

export default router;
