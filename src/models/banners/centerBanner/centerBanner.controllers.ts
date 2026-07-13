import { Request, Response } from "express";
import CenterBanner from "./centerBanner.model";
import uploadClouinary from "../../../utils/cloudinary"; 
import { cache } from "../../../utils/cache"; 

// Create Home Banner
export const createCenterBanner = async (req: Request, res: Response) => {
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

    const newBanner = await CenterBanner.create({
      title,
      Description,
      Link_URL,
      status,
      images: imageUrls,
    });

    await cache.del("banners:center");
    await cache.delByPrefix("homepage");

    return res.status(201).json({
      success: true,
      message: "Center banner created successfully",
      data: newBanner,
    });
  } catch (error: any) {
    console.error("Create CenterBanner error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  Get All Banners
export const getAllCenterBanner = async (req: Request, res: Response) => {
  try {
    const cacheKey = "banners:center";
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
      return res.status(200).json(cached);
    }

    const banners = await CenterBanner.find().sort({ createdAt: -1 }).lean();
    const response = { success: true, data: banners };
    await cache.set(cacheKey, response, 300);
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  Get Single Banner
export const getSingleCenterBanner = async (req: Request, res: Response) => {
  try {
    const banner = await CenterBanner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }
    return res.status(200).json({ success: true, data: banner });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  Update Banner
export const updateCenterBanner= async (req: Request, res: Response) => {
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

    const updatedBanner = await CenterBanner.findByIdAndUpdate(
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

    await cache.del("banners:center");
    await cache.delByPrefix("homepage");

    return res.status(200).json({
      success: true,
      message: "Center banner updated successfully",
      data: updatedBanner,
    });
  } catch (error: any) {
    console.error("Update CenterBanner error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  Delete Banner
export const deleteCenterBanner = async (req: Request, res: Response) => {
  try {
    const banner = await CenterBanner.findByIdAndDelete(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    await cache.del("banners:center");
    await cache.delByPrefix("homepage");

    return res.status(200).json({ success: true, message: "Banner deleted successfully" });
  } catch (error: any) {
    console.error("Delete CenterBanner error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
