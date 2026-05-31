import express from "express";
import {
    createModule,
    getAllModulesAdmin,
    getActiveModules,
    updateModule,
    deleteModule
} from "./videoModule.controllers";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";

const router = express.Router();

// Public / Dropshipper route
router.get("/all", getActiveModules);

// Admin routes
router.post("/admin/create", isAuth, isAdmin, createModule);
router.get("/admin/all", isAuth, isAdmin, getAllModulesAdmin);
router.put("/admin/:id", isAuth, isAdmin, updateModule);
router.delete("/admin/:id", isAuth, isAdmin, deleteModule);

export default router;
