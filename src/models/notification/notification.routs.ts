import { createNotification, deleteNotification, getNotifications, markAllAsRead, markAsRead } from "./notification.controllers";
import express from "express";
const router = express.Router();

// Public or protected depending on your auth
router.post("/", createNotification);            // create new notification (can be called by backend core events)
router.get("/", getNotifications);               // list notifications
router.post("/:id/read", markAsRead);            // mark single read
router.post("/mark-all-read", markAllAsRead);    // mark all read
router.delete("/:id", deleteNotification);       // delete

module.exports = router;
