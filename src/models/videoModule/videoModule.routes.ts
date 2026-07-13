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
import { isDashboardAccess } from "../../middlewares/isDashboardAccess";

const router = express.Router();

// Public / Dropshipper route
router.get("/all", getActiveModules);

// Admin / Manager routes (dropshipping manage video)
router.post("/admin/create", isAuth, isDashboardAccess("dropshipping"), createModule);
router.get("/admin/all", isAuth, isDashboardAccess("dropshipping"), getAllModulesAdmin);
router.put("/admin/:id", isAuth, isDashboardAccess("dropshipping"), updateModule);
router.delete("/admin/:id", isAuth, isDashboardAccess("dropshipping"), deleteModule);

export default router;
