"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const videoCourse_controllers_1 = require("./videoCourse.controllers");
const isAuth_1 = require("../../middlewares/isAuth");
const isAdmin_1 = require("../../middlewares/isAdmin");
const router = express_1.default.Router();
// Public / User routes
router.get("/all", videoCourse_controllers_1.getAllCourses);
// Admin routes
router.get("/admin/all", isAuth_1.isAuth, isAdmin_1.isAdmin, videoCourse_controllers_1.adminGetAllCourses);
router.post("/admin/create", isAuth_1.isAuth, isAdmin_1.isAdmin, videoCourse_controllers_1.createCourse);
router.put("/admin/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, videoCourse_controllers_1.updateCourse);
router.delete("/admin/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, videoCourse_controllers_1.deleteCourse);
exports.default = router;
