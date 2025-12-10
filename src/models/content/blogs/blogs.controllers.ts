import { Request, Response } from "express";
import Blog from "./blogs.model";
import moment from "moment";
import "moment/locale/bn";
import uploadClouinary from "../../../utils/cloudinary";

export const createBlog = async (req: Request, res: Response) => {
  try {
    const { title, author, category, status, excerpt, content } = req.body;

    const now = moment().locale("bn");

    const file = req.file?.buffer;
    let image = "";
    if (file) {
      image = await uploadClouinary(file);
    }


    const blog = new Blog({
      title,
      author,
      category,
      status,
      image,
      excerpt,
      content,
      createdDateBn: now.format("DD MMMM, YYYY"),
      createdTimeBn: now.format("hh:mm A"),
    });

    const savedBlog = await blog.save();
    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: savedBlog,
    });
  } catch (error) {
    console.error("Create Blog Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

//  Get All Blogs
export const getAllBlogs = async (_req: Request, res: Response) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: blogs });
  } catch (error) {
    console.error("Get Blogs Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get Single Blog
export const getBlogById = async (req: Request, res: Response) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    console.error("Get Blog Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

//  Update Blog
export const updateBlog = async (req: Request, res: Response) => {
  try {
    const now = moment().locale("bn");

    const file = req.file?.buffer;
    let image = req.body.image || "";

    if (file) {
      image = await uploadClouinary(file);
    }
    const updateData = {
      ...req.body,
      image,
      updatedDateBn: now.format("DD MMMM, YYYY"),
      updatedTimeBn: now.format("hh:mm A"),
    };

    const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    if (!updatedBlog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    res.status(200).json({ success: true, message: "Blog updated", data: updatedBlog });
  } catch (error) {
    console.error("Update Blog Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

//  Delete Blog
export const deleteBlog = async (req: Request, res: Response) => {
  try {
    const deletedBlog = await Blog.findByIdAndDelete(req.params.id);
    if (!deletedBlog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    res.status(200).json({ success: true, message: "Blog deleted successfully" });
  } catch (error) {
    console.error("Delete Blog Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
