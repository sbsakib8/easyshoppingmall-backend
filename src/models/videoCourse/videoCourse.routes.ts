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
import { isDashboardAccess } from "../../middlewares/isDashboardAccess";

const router = express.Router();

// Public / User routes
router.get("/all", getAllCourses);

// Admin / Manager routes (dropshipping manage video)
router.get("/admin/all", isAuth, isDashboardAccess("dropshipping"), adminGetAllCourses);
router.post("/admin/create", isAuth, isDashboardAccess("dropshipping"), createCourse);
router.put("/admin/:id", isAuth, isDashboardAccess("dropshipping"), updateCourse);
router.delete("/admin/:id", isAuth, isDashboardAccess("dropshipping"), deleteCourse);

export default router;
