import express from "express";
import {upload} from "../../../middlewares/multer";
import { createRightBanner, deleteRightBanner, getAllRightBanners, getSingleRightBanner, updateRightBanner } from "./rightBanner.controllers";
import { isAuth } from "../../../middlewares/isAuth";
import { isDashboardAccess } from "../../../middlewares/isDashboardAccess";

const router = express.Router();

router.post("/create",isAuth, isDashboardAccess("banner"), upload.array("images" , 4), createRightBanner);
router.get("/get", getAllRightBanners);
router.get("/:id", getSingleRightBanner);
router.put("/:id",isAuth, isDashboardAccess("banner"), upload.array("images" , 4), updateRightBanner);
router.delete("/:id",isAuth, isDashboardAccess("banner"), deleteRightBanner);

export default router;
 
