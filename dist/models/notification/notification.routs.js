"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const notification_controllers_1 = require("./notification.controllers");
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
// Public or protected depending on your auth
router.post("/", notification_controllers_1.createNotification); // create new notification (can be called by backend core events)
router.get("/", notification_controllers_1.getNotifications); // list notifications
router.put("/:id/read", notification_controllers_1.markAsRead); // mark single read
router.put("/mark-all-read", notification_controllers_1.markAllAsRead); // mark all read
router.delete("/:id", notification_controllers_1.deleteNotification); // delete
exports.default = router;
