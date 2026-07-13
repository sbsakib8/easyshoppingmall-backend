"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = require("../../../middlewares/multer");
const leftBanner_controllers_1 = require("./leftBanner.controllers");
const isAuth_1 = require("../../../middlewares/isAuth");
const isDashboardAccess_1 = require("../../../middlewares/isDashboardAccess");
const router = express_1.default.Router();
router.post("/create", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("banner"), multer_1.upload.array("images", 4), leftBanner_controllers_1.createLeftBanner);
router.get("/get", leftBanner_controllers_1.getAllLeftBanners);
router.get("/:id", leftBanner_controllers_1.getSingleLeftBanner);
router.put("/:id", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("banner"), multer_1.upload.array("images", 4), leftBanner_controllers_1.updateLeftBanner);
router.delete("/:id", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("banner"), leftBanner_controllers_1.deleteLeftBanner);
exports.default = router;
