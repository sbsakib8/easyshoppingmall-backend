"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = require("../../../middlewares/multer");
const homeBanner_controllers_1 = require("./homeBanner.controllers");
const isAuth_1 = require("../../../middlewares/isAuth");
const isAdmin_1 = require("../../../middlewares/isAdmin");
const router = express_1.default.Router();
router.post("/create", isAuth_1.isAuth, isAdmin_1.isAdmin, multer_1.upload.array("images", 4), homeBanner_controllers_1.createHomeBanner);
router.get("/get", homeBanner_controllers_1.getAllHomeBanners);
router.get("/:id", homeBanner_controllers_1.getSingleHomeBanner);
router.put("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, multer_1.upload.array("images", 4), homeBanner_controllers_1.updateHomeBanner);
router.delete("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, homeBanner_controllers_1.deleteHomeBanner);
exports.default = router;
