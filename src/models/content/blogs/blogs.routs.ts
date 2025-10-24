import express from "express";
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
} from "./blogs.controllers";
import { upload } from "../../../middlewares/multer";

const router = express.Router();

router.post("/create", upload.single("image"), createBlog);      
router.get("/get", getAllBlogs);      
router.get("/:id", getBlogById);   
router.put("/:id", upload.single("image"), updateBlog);    
router.delete("/:id", deleteBlog); 

export default router;
