"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const blogs_controllers_1 = require("./blogs.controllers");
const multer_1 = require("../../../middlewares/multer");
const router = express_1.default.Router();
router.post("/create", multer_1.upload.single("image"), blogs_controllers_1.createBlog);
router.get("/get", blogs_controllers_1.getAllBlogs);
router.get("/:id", blogs_controllers_1.getBlogById);
router.put("/:id", multer_1.upload.single("image"), blogs_controllers_1.updateBlog);
router.delete("/:id", blogs_controllers_1.deleteBlog);
exports.default = router;
