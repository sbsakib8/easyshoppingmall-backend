import express from "express";
import {upload} from "../../../middlewares/multer";
import { createCenterBanner, deleteCenterBanner, getAllCenterBanner, getSingleCenterBanner, updateCenterBanner } from "./centerBanner.controllers";
import { isAuth } from "../../../middlewares/isAuth";
import { isDashboardAccess } from "../../../middlewares/isDashboardAccess";

const router = express.Router();

router.post("/create",isAuth, isDashboardAccess("banner"), upload.array("images", 4), createCenterBanner);
router.get("/get", getAllCenterBanner);
router.get("/:id", getSingleCenterBanner);
router.put("/:id",isAuth, isDashboardAccess("banner"), upload.array("images", 4), updateCenterBanner);
router.delete("/:id",isAuth, isDashboardAccess("banner"), deleteCenterBanner);

export default router;
 
