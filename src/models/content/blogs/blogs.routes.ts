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

const router = express.Router();

router.post("/create",isAuth,isAdmin, upload.single("image"), createBlog);      
router.get("/get", getAllBlogs);      
router.get("/:id", getBlogById);   
router.put("/:id",isAuth,isAdmin, upload.single("image"), updateBlog);    
router.delete("/:id",isAuth,isAdmin, deleteBlog); 

export default router;
