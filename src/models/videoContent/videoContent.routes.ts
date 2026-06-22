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
import { isDashboardAccess } from "../../middlewares/isDashboardAccess";
import { optionalAuth } from "../../middlewares/optionalAuth";

const router = express.Router();

router.get("/all", optionalAuth, getAllVideos);

// Admin / Manager routes (dropshipping manage video)
router.get("/admin/all", isAuth, isDashboardAccess("dropshipping"), adminGetAllVideos);
router.post("/create", isAuth, isDashboardAccess("dropshipping"), createVideo);
router.patch("/update/:id", isAuth, isDashboardAccess("dropshipping"), updateVideo);
router.delete("/delete/:id", isAuth, isDashboardAccess("dropshipping"), deleteVideo);

export default router;
