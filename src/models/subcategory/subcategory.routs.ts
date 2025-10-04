import express from "express";
import {
  createSubCategory,
  getSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
} from "./subcategory.controllers";

const router = express.Router();

// Create SubCategory
router.post("/create", createSubCategory);

// Get All SubCategories
router.get("/", getSubCategories);

// Get Single SubCategory
router.get("/:id", getSubCategoryById);

// Update SubCategory
router.put("/:id", updateSubCategory);

// Delete SubCategory
router.delete("/:id", deleteSubCategory);

export default router;
