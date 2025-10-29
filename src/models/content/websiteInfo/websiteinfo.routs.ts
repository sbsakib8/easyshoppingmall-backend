import express from "express";
import {
  createWebsiteInfo,
  getAllWebsiteInfo,
  updateWebsiteInfo,
  deleteWebsiteInfo,
} from "./websiteinfo.controllers";
import { isAuth } from "../../../middlewares/isAuth";
import { isAdmin } from "../../../middlewares/isAdmin";

const router = express.Router();

// CREATE
router.post("/create",isAuth,isAdmin, createWebsiteInfo);

// READ
router.get("/get", getAllWebsiteInfo);

// UPDATE
router.put("/:id",isAuth,isAdmin, updateWebsiteInfo);

// DELETE
router.delete("/:id",isAuth,isAdmin, deleteWebsiteInfo);

export default router;
