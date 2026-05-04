import express from "express";
import {
  createSubCategory,
  getSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
} from "./subcategory.controllers";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";
import { upload } from "../../middlewares/multer";

const router = express.Router();

// Create SubCategory
router.post("/create",isAuth,isAdmin,upload.single("image"), createSubCategory);

// Get All SubCategories
router.get("/", getSubCategories);

// Get Single SubCategory
router.get("/:id", getSubCategoryById);

// Update SubCategory
router.put("/:id",isAuth,isAdmin,upload.single("image"), updateSubCategory);

// Delete SubCategory
router.delete("/:id",isAuth,isAdmin, deleteSubCategory);

export default router;
