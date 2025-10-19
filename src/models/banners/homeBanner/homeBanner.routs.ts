import express from "express";
import {upload} from "../../../middlewares/multer";
import {
  createHomeBanner,
  getAllHomeBanners,
  getSingleHomeBanner,
  updateHomeBanner,
  deleteHomeBanner,
} from "./homeBanner.controllers";

const router = express.Router();

router.post("/", upload.array("images"), createHomeBanner);
router.get("/", getAllHomeBanners);
router.get("/:id", getSingleHomeBanner);
router.put("/:id", upload.array("images"), updateHomeBanner);
router.delete("/:id", deleteHomeBanner);

export default router;
