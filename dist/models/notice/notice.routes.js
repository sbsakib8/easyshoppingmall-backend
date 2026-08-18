"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const isAuth_1 = require("../../middlewares/isAuth");
const isAdmin_1 = require("../../middlewares/isAdmin");
const notice_controllers_1 = require("./notice.controllers");
const router = express_1.default.Router();
// Public route - get active notices for dropshipping user overview
router.get("/active", notice_controllers_1.getActiveNotices);
// Admin routes
router.post("/", isAuth_1.isAuth, isAdmin_1.isAdmin, notice_controllers_1.createNotice);
router.get("/admin/all", isAuth_1.isAuth, isAdmin_1.isAdmin, notice_controllers_1.getAllNoticesAdmin);
router.get("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, notice_controllers_1.getNoticeById);
router.put("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, notice_controllers_1.updateNotice);
router.delete("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, notice_controllers_1.deleteNotice);
router.patch("/:id/toggle", isAuth_1.isAuth, isAdmin_1.isAdmin, notice_controllers_1.toggleNoticeStatus);
exports.default = router;
