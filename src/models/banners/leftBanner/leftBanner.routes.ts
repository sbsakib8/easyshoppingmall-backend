import express from "express";
import {upload} from "../../../middlewares/multer";
import { createLeftBanner, deleteLeftBanner, getAllLeftBanners, getSingleLeftBanner, updateLeftBanner } from "./leftBanner.controllers";
import { isAuth } from "../../../middlewares/isAuth";
import { isDashboardAccess } from "../../../middlewares/isDashboardAccess";

const router = express.Router();

router.post("/create",isAuth, isDashboardAccess("banner"), upload.array("images", 4), createLeftBanner);
router.get("/get", getAllLeftBanners);
router.get("/:id", getSingleLeftBanner);
router.put("/:id",isAuth, isDashboardAccess("banner"), upload.array("images" , 4), updateLeftBanner);
router.delete("/:id",isAuth, isDashboardAccess("banner"), deleteLeftBanner);

export default router;
 
