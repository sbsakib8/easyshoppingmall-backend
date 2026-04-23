import express from "express";
import {upload} from "../../../middlewares/multer";
import { createLeftBanner, deleteLeftBanner, getAllLeftBanners, getSingleLeftBanner, updateLeftBanner } from "./leftBanner.controllers";
import { isAuth } from "../../../middlewares/isAuth";
import { isAdmin } from "../../../middlewares/isAdmin";

const router = express.Router();

router.post("/create",isAuth, isAdmin, upload.array("images", 4), createLeftBanner);
router.get("/get", getAllLeftBanners);
router.get("/:id", getSingleLeftBanner);
router.put("/:id",isAuth, isAdmin, upload.array("images" , 4), updateLeftBanner);
router.delete("/:id",isAuth, isAdmin, deleteLeftBanner);

export default router;
 
