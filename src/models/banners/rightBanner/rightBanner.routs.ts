import express from "express";
import {upload} from "../../../middlewares/multer";
import { createRightBanner, deleteRightBanner, getAllRightBanners, getSingleRightBanner, updateRightBanner } from "./rightBanner.controllers";
import { isAuth } from "../../../middlewares/isAuth";
import { isAdmin } from "../../../middlewares/isAdmin";

const router = express.Router();

router.post("/create",isAuth, isAdmin, upload.array("images"), createRightBanner);
router.get("/get", getAllRightBanners);
router.get("/:id", getSingleRightBanner);
router.put("/:id",isAuth, isAdmin, upload.array("images"), updateRightBanner);
router.delete("/:id",isAuth, isAdmin, deleteRightBanner);

export default router;
 
