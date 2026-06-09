"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const notification_controllers_1 = require("./notification.controllers");
const express_1 = __importDefault(require("express"));
const isAuth_1 = require("../../middlewares/isAuth");
const isAdmin_1 = require("../../middlewares/isAdmin");
const router = express_1.default.Router();
router.post("/", isAuth_1.isAuth, isAdmin_1.isAdmin, notification_controllers_1.createNotification);
router.get("/", isAuth_1.isAuth, notification_controllers_1.getNotifications);
router.put("/:id/read", isAuth_1.isAuth, notification_controllers_1.markAsRead);
router.put("/mark-all-read", isAuth_1.isAuth, notification_controllers_1.markAllAsRead);
router.delete("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, notification_controllers_1.deleteNotification);
exports.default = router;
