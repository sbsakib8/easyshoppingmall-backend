import express from "express";
import {
  createWebsiteInfo,
  getAllWebsiteInfo,
  updateWebsiteInfo,
  deleteWebsiteInfo,
} from "./websiteinfo.controllers";
import { isAuth } from "../../../middlewares/isAuth";
import { isDashboardAccess } from "../../../middlewares/isDashboardAccess";

const router = express.Router();

// CREATE
router.post("/create",isAuth,isDashboardAccess("content"), createWebsiteInfo);

// READ
router.get("/get", getAllWebsiteInfo);

// UPDATE
router.put("/:id",isAuth,isDashboardAccess("content"), updateWebsiteInfo);

// DELETE
router.delete("/:id",isAuth,isDashboardAccess("content"), deleteWebsiteInfo);

export default router;
