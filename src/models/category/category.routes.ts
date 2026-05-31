import express from "express";
import {
  createCategory,
  getCategories,
  getCategoryTree,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "./category.controllers";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";
import { upload } from "../../middlewares/multer";

const router = express.Router();

// Create Category
router.post("/create", isAuth, isAdmin, upload.single("image"), createCategory);

// Get All Categories
router.get("/", getCategories);

// Get Category Tree
router.get("/get-tree", getCategoryTree);

// Get Single Category
router.get("/:id", isAuth, isAdmin, getCategoryById);

// Update Category
router.put("/:id", isAuth, isAdmin, upload.single("image"), updateCategory);

// Delete Category
router.delete("/:id", isAuth, isAdmin, deleteCategory);

export default router;
