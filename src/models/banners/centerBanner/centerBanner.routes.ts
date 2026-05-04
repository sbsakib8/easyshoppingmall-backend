import express from "express";
import {upload} from "../../../middlewares/multer";
import { createCenterBanner, deleteCenterBanner, getAllCenterBanner, getSingleCenterBanner, updateCenterBanner } from "./centerBanner.controllers";
import { isAuth } from "../../../middlewares/isAuth";
import { isAdmin } from "../../../middlewares/isAdmin";

const router = express.Router();

router.post("/create",isAuth, isAdmin, upload.array("images", 4), createCenterBanner);
router.get("/get", getAllCenterBanner);
router.get("/:id", getSingleCenterBanner);
router.put("/:id",isAuth, isAdmin, upload.array("images", 4), updateCenterBanner);
router.delete("/:id",isAuth, isAdmin, deleteCenterBanner);

export default router;
 
