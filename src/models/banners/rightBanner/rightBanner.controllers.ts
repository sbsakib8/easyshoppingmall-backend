import { Request, Response } from "express";
import RightBanner from "./rightBanner.model";
import uploadClouinary from "../../../utils/cloudinary"; 
import fs from "fs";

// Create Home Banner
export const createRightBanner = async (req: Request, res: Response) => {
  try {
    const { title, Description, Link_URL, status } = req.body;
    const files = req.files as Express.Multer.File[];

    let imageUrls: string[] = [];

    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        const imageUrl = await uploadClouinary(file.buffer);
        return imageUrl;
      });

      imageUrls = await Promise.all(uploadPromises);
    }

    const newBanner = await RightBanner.create({
      title,
      Description,
      Link_URL,
      status,
      images: imageUrls,
    });

    return res.status(201).json({
      success: true,
      message: "Right banner created successfully",
      data: newBanner,
    });
  } catch (error: any) {
    console.error("Create RightBanner error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  Get All Banners
export const getAllRightBanners = async (req: Request, res: Response) => {
  try {
    const banners = await RightBanner.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: banners });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  Get Single Banner
export const getSingleRightBanner = async (req: Request, res: Response) => {
  try {
    const banner = await RightBanner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }
    return res.status(200).json({ success: true, data: banner });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  Update Banner
export const updateRightBanner = async (req: Request, res: Response) => {
  try {
    const { title, Description, Link_URL, status } = req.body;
    const files = req.files as Express.Multer.File[];

    let imageUrls: string[] = [];

    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        const imageUrl = await uploadClouinary(file.buffer);
        return imageUrl;
      });

      imageUrls = await Promise.all(uploadPromises);
    }

    const updatedBanner = await RightBanner.findByIdAndUpdate(
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
      message: "Right banner updated successfully",
      data: updatedBanner,
    });
  } catch (error: any) {
    console.error("Update RightBanner error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  Delete Banner
export const deleteRightBanner = async (req: Request, res: Response) => {
  try {
    const banner = await RightBanner.findByIdAndDelete(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }
    return res.status(200).json({ success: true, message: "Banner deleted successfully" });
  } catch (error: any) {
    console.error("Delete RightBanner error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
