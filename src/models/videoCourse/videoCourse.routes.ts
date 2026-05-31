import express from "express";
import {
    getAllCourses,
    adminGetAllCourses,
    createCourse,
    updateCourse,
    deleteCourse
} from "./videoCourse.controllers";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";

const router = express.Router();

// Public / User routes
router.get("/all", getAllCourses);

// Admin routes
router.get("/admin/all", isAuth, isAdmin, adminGetAllCourses);
router.post("/admin/create", isAuth, isAdmin, createCourse);
router.put("/admin/:id", isAuth, isAdmin, updateCourse);
router.delete("/admin/:id", isAuth, isAdmin, deleteCourse);

export default router;
