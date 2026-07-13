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
import { isDashboardAccess } from "../../middlewares/isDashboardAccess";
import { upload } from "../../middlewares/multer";

const router = express.Router();

// Create Category
router.post("/create", isAuth, isDashboardAccess("products"), upload.single("image"), createCategory);

// Get All Categories
router.get("/", getCategories);

// Get Category Tree
router.get("/get-tree", getCategoryTree);

// Get Single Category (public, like GET /)
router.get("/:id", getCategoryById);

// Update Category
router.put("/:id", isAuth, isDashboardAccess("products"), upload.single("image"), updateCategory);

// Delete Category
router.delete("/:id", isAuth, isDashboardAccess("products"), deleteCategory);

export default router;
