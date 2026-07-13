import express from "express";
import {
  createSubCategory,
  getSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
} from "./subcategory.controllers";
import { isAuth } from "../../middlewares/isAuth";
import { isDashboardAccess } from "../../middlewares/isDashboardAccess";
import { upload } from "../../middlewares/multer";

const router = express.Router();

// Create SubCategory
router.post("/create",isAuth,isDashboardAccess("products"),upload.single("image"), createSubCategory);

// Get All SubCategories
router.get("/", getSubCategories);

// Get Single SubCategory
router.get("/:id", getSubCategoryById);

// Update SubCategory
router.put("/:id",isAuth,isDashboardAccess("products"),upload.single("image"), updateSubCategory);

// Delete SubCategory
router.delete("/:id",isAuth,isDashboardAccess("products"), deleteSubCategory);

export default router;
