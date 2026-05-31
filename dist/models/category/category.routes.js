"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const category_controllers_1 = require("./category.controllers");
const isAuth_1 = require("../../middlewares/isAuth");
const isAdmin_1 = require("../../middlewares/isAdmin");
const multer_1 = require("../../middlewares/multer");
const router = express_1.default.Router();
// Create Category
router.post("/create", isAuth_1.isAuth, isAdmin_1.isAdmin, multer_1.upload.single("image"), category_controllers_1.createCategory);
// Get All Categories
router.get("/", category_controllers_1.getCategories);
// Get Category Tree
router.get("/get-tree", category_controllers_1.getCategoryTree);
// Get Single Category
router.get("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, category_controllers_1.getCategoryById);
// Update Category
router.put("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, multer_1.upload.single("image"), category_controllers_1.updateCategory);
// Delete Category
router.delete("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, category_controllers_1.deleteCategory);
exports.default = router;
