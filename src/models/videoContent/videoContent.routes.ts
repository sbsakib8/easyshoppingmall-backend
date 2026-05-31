import express from "express";
import { 
    getAllVideos, 
    adminGetAllVideos, 
    createVideo, 
    updateVideo, 
    deleteVideo 
} from "./videoContent.controllers";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";
import { optionalAuth } from "../../middlewares/optionalAuth";

const router = express.Router();

router.get("/all", optionalAuth, getAllVideos);

// Admin routes
router.get("/admin/all", isAuth, isAdmin, adminGetAllVideos);
router.post("/create", isAuth, isAdmin, createVideo);
router.patch("/update/:id", isAuth, isAdmin, updateVideo);
router.delete("/delete/:id", isAuth, isAdmin, deleteVideo);

export default router;
