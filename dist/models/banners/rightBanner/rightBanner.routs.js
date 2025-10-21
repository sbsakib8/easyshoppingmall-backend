"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = require("../../../middlewares/multer");
const rightBanner_controllers_1 = require("./rightBanner.controllers");
const isAuth_1 = require("../../../middlewares/isAuth");
const isAdmin_1 = require("../../../middlewares/isAdmin");
const router = express_1.default.Router();
router.post("/create", isAuth_1.isAuth, isAdmin_1.isAdmin, multer_1.upload.array("images"), rightBanner_controllers_1.createRightBanner);
router.get("/get", rightBanner_controllers_1.getAllRightBanners);
router.get("/:id", rightBanner_controllers_1.getSingleRightBanner);
router.put("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, multer_1.upload.array("images"), rightBanner_controllers_1.updateRightBanner);
router.delete("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, rightBanner_controllers_1.deleteRightBanner);
exports.default = router;
