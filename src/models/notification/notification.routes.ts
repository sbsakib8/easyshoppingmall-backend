import { createNotification, deleteNotification, getNotifications, markAllAsRead, markAsRead } from "./notification.controllers";
import express from "express";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";
const router = express.Router();

router.post("/", isAuth, isAdmin, createNotification);
router.get("/", isAuth, getNotifications);
router.put("/:id/read", isAuth, markAsRead);
router.put("/mark-all-read", isAuth, markAllAsRead);
router.delete("/:id", isAuth, isAdmin, deleteNotification);

export default router;
