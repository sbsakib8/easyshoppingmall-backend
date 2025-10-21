"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = require("../../../middlewares/multer");
const centerBanner_controllers_1 = require("./centerBanner.controllers");
const isAuth_1 = require("../../../middlewares/isAuth");
const isAdmin_1 = require("../../../middlewares/isAdmin");
const router = express_1.default.Router();
router.post("/create", isAuth_1.isAuth, isAdmin_1.isAdmin, multer_1.upload.array("images"), centerBanner_controllers_1.createCenterBanner);
router.get("/get", centerBanner_controllers_1.getAllCenterBanner);
router.get("/:id", centerBanner_controllers_1.getSingleCenterBanner);
router.put("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, multer_1.upload.array("images"), centerBanner_controllers_1.updateCenterBanner);
router.delete("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, centerBanner_controllers_1.deleteCenterBanner);
exports.default = router;
