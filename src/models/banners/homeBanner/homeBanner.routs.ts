import express from "express";
import {upload} from "../../../middlewares/multer";
import {
  createHomeBanner,
  getAllHomeBanners,
  getSingleHomeBanner,
  updateHomeBanner,
  deleteHomeBanner,
} from "./homeBanner.controllers";
import { isAuth } from "../../../middlewares/isAuth";
import { isAdmin } from "../../../middlewares/isAdmin";

const router = express.Router();

router.post("/create",isAuth, isAdmin, upload.array("images"), createHomeBanner);
router.get("/get", getAllHomeBanners);
router.get("/:id", getSingleHomeBanner);
router.put("/:id",isAuth, isAdmin, upload.array("images"), updateHomeBanner);
router.delete("/:id",isAuth, isAdmin, deleteHomeBanner);

export default router;
 
