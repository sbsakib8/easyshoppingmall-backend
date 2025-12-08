import { Request, Response } from "express";
import LeftBanner from "./leftBanner.model";
import uploadClouinary from "../../../utils/cloudinary"; 
import fs from "fs";

// Create Home Banner
export const createLeftBanner = async (req: Request, res: Response) => {
  try {
    const { title, Description, Link_URL, status } = req.body;
    const files = req.files as Express.Multer.File[];

    let imageUrls: string[] = [];

    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        const imageUrl = await uploadClouinary(file.path);
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return imageUrl;
      });

      imageUrls = await Promise.all(uploadPromises);
    }

    const newBanner = await LeftBanner.create({
      title,
      Description,
      Link_URL,
      status,
      images: imageUrls,
    });

    return res.status(201).json({
      success: true,
      message: "Left banner created successfully",
      data: newBanner,
    });
  } catch (error: any) {
    console.error("Create LeftBanner error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  Get All Banners
export const getAllLeftBanners = async (req: Request, res: Response) => {
  try {
    const banners = await LeftBanner.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: banners });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  Get Single Banner
export const getSingleLeftBanner = async (req: Request, res: Response) => {
  try {
    const banner = await LeftBanner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }
    return res.status(200).json({ success: true, data: banner });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  Update Banner
export const updateLeftBanner = async (req: Request, res: Response) => {
  try {
    const { title, Description, Link_URL, status } = req.body;
    const files = req.files as Express.Multer.File[];

    let imageUrls: string[] = [];

    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        const imageUrl = await uploadClouinary(file.path);
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return imageUrl;
      });

      imageUrls = await Promise.all(uploadPromises);
    }

    const updatedBanner = await LeftBanner.findByIdAndUpdate(
      req.params.id,
      {
        title,
        Description,
        Link_URL,
        status,
        ...(imageUrls.length > 0 && { images: imageUrls }),
      },
      { new: true }
    );

    if (!updatedBanner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Left banner updated successfully",
      data: updatedBanner,
    });
  } catch (error: any) {
    console.error("Update LeftBanner error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  Delete Banner
export const deleteLeftBanner = async (req: Request, res: Response) => {
  try {
    const banner = await LeftBanner.findByIdAndDelete(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }
    return res.status(200).json({ success: true, message: "Banner deleted successfully" });
  } catch (error: any) {
    console.error("Delete LeftBanner error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
