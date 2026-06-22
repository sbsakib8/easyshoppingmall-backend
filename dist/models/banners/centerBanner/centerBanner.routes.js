"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = require("../../../middlewares/multer");
const centerBanner_controllers_1 = require("./centerBanner.controllers");
const isAuth_1 = require("../../../middlewares/isAuth");
const isDashboardAccess_1 = require("../../../middlewares/isDashboardAccess");
const router = express_1.default.Router();
router.post("/create", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("banner"), multer_1.upload.array("images", 4), centerBanner_controllers_1.createCenterBanner);
router.get("/get", centerBanner_controllers_1.getAllCenterBanner);
router.get("/:id", centerBanner_controllers_1.getSingleCenterBanner);
router.put("/:id", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("banner"), multer_1.upload.array("images", 4), centerBanner_controllers_1.updateCenterBanner);
router.delete("/:id", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("banner"), centerBanner_controllers_1.deleteCenterBanner);
exports.default = router;
