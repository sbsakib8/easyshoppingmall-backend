"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = require("../../../middlewares/multer");
const leftBanner_controllers_1 = require("./leftBanner.controllers");
const isAuth_1 = require("../../../middlewares/isAuth");
const isAdmin_1 = require("../../../middlewares/isAdmin");
const router = express_1.default.Router();
router.post("/create", isAuth_1.isAuth, isAdmin_1.isAdmin, multer_1.upload.array("images"), leftBanner_controllers_1.createLeftBanner);
router.get("/get", leftBanner_controllers_1.getAllLeftBanners);
router.get("/:id", leftBanner_controllers_1.getSingleLeftBanner);
router.put("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, multer_1.upload.array("images"), leftBanner_controllers_1.updateLeftBanner);
router.delete("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, leftBanner_controllers_1.deleteLeftBanner);
exports.default = router;
