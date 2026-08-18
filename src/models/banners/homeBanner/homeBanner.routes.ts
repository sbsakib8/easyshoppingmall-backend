import express from "express";
import {upload} from "../../../middlewares/multer";
import {
  createHomeBanner,
  getAllHomeBanners,
  getSingleHomeBanner,
  updateHomeBanner,
  deleteHomeBanner,
  toggleHomeBannerActive,
} from "./homeBanner.controllers";
import { isAuth } from "../../../middlewares/isAuth";
import { isAdmin } from "../../../middlewares/isAdmin";
import { isDashboardAccess } from "../../../middlewares/isDashboardAccess";

const router = express.Router();

router.post("/create",isAuth, isDashboardAccess("banner"), upload.array("images",4), createHomeBanner);
router.get("/get", getAllHomeBanners);
router.get("/:id", getSingleHomeBanner);
router.put("/:id",isAuth, isDashboardAccess("banner"), upload.array("images" , 4), updateHomeBanner);
router.patch("/:id/toggle-active", isAuth, isDashboardAccess("banner"), toggleHomeBannerActive);
router.delete("/:id",isAuth, isDashboardAccess("banner"), deleteHomeBanner);

export default router;
 
