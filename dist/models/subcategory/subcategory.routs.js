"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const subcategory_controllers_1 = require("./subcategory.controllers");
const isAuth_1 = require("../../middlewares/isAuth");
const isAdmin_1 = require("../../middlewares/isAdmin");
const multer_1 = require("../../middlewares/multer");
const router = express_1.default.Router();
// Create SubCategory
router.post("/create", isAuth_1.isAuth, isAdmin_1.isAdmin, multer_1.upload.single("image"), subcategory_controllers_1.createSubCategory);
// Get All SubCategories
router.get("/", subcategory_controllers_1.getSubCategories);
// Get Single SubCategory
router.get("/:id", subcategory_controllers_1.getSubCategoryById);
// Update SubCategory
router.put("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, multer_1.upload.single("image"), subcategory_controllers_1.updateSubCategory);
// Delete SubCategory
router.delete("/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, subcategory_controllers_1.deleteSubCategory);
exports.default = router;
