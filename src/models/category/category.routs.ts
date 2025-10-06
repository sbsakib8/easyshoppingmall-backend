import express from "express";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "./category.controllers";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";

const router = express.Router();

// Create Category
router.post("/create",isAuth,isAdmin, createCategory);

// Get All Categories
router.get("/",isAuth,isAdmin, getCategories);

// Get Single Category
router.get("/:id",isAuth,isAdmin, getCategoryById);

// Update Category
router.put("/:id",isAuth,isAdmin, updateCategory);

// Delete Category
router.delete("/:id",isAuth,isAdmin, deleteCategory);

export default router;
