import express from "express";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";
import {
  createNotice,
  getAllNoticesAdmin,
  getActiveNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
  toggleNoticeStatus,
} from "./notice.controllers";

const router = express.Router();

// Public route - get active notices for dropshipping user overview
router.get("/active", getActiveNotices);

// Admin routes
router.post("/", isAuth, isAdmin, createNotice);
router.get("/admin/all", isAuth, isAdmin, getAllNoticesAdmin);
router.get("/:id", isAuth, isAdmin, getNoticeById);
router.put("/:id", isAuth, isAdmin, updateNotice);
router.delete("/:id", isAuth, isAdmin, deleteNotice);
router.patch("/:id/toggle", isAuth, isAdmin, toggleNoticeStatus);

export default router;
