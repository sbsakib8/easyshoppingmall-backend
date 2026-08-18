import express from "express";
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
} from "./blogs.controllers";
import { upload } from "../../../middlewares/multer";
import { isAuth } from "../../../middlewares/isAuth";
import { isAdmin } from "../../../middlewares/isAdmin";
import { isDashboardAccess } from "../../../middlewares/isDashboardAccess";

const router = express.Router();

router.post("/create",isAuth, isDashboardAccess("content"), upload.single("image"), createBlog);      
router.get("/get", getAllBlogs);      
router.get("/:id", getBlogById);   
router.put("/:id",isAuth, isDashboardAccess("content"), upload.single("image"), updateBlog);    
router.delete("/:id",isAuth, isDashboardAccess("content"), deleteBlog); 

export default router;
