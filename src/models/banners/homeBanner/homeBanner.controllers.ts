import { Request, Response } from "express";
import HomeBanner from "./homeBanner.model";
import uploadClouinary from "../../../utils/cloudinary"; // your uploader util
import fs from "fs";
import { cache } from "../../../utils/cache";

// Create Home Banner
export const createHomeBanner = async (req: Request, res: Response) => {
  try {
    const { title, Description, Link_URL, active, sliderFor } = req.body;
    const files = req.files as Express.Multer.File[];

    let imageUrls: string[] = [];

    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        const imageUrl = await uploadClouinary(file.buffer);
        return imageUrl;
      });

      imageUrls = await Promise.all(uploadPromises);
    }

    const newBanner = await HomeBanner.create({
      title,
      Description,
      Link_URL,
      active,
      sliderFor: sliderFor || "USER",
      images: imageUrls,
    });

    await cache.delByPrefix("banners:home:");
    await cache.delByPrefix("homepage");
    return res.status(201).json({
      success: true,
      message: "Home banner created successfully",
      data: newBanner,
    });
  } catch (error: any) {
    console.error("Create HomeBanner error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  Get All Banners
export const getAllHomeBanners = async (req: Request, res: Response) => {
  try {
    const { sliderFor, active } = req.query;
    const cacheKey = `banners:home:${sliderFor || 'all'}:${active || 'all'}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
      return res.status(200).json(cached);
    }

    const filter: any = {};

    if (sliderFor) {
      filter.sliderFor = sliderFor;
    }

    if (active !== undefined) {
      filter.active = active === "true";
    }

    const banners = await HomeBanner.find(filter).sort({ createdAt: -1 });
    const response = { success: true, data: banners };
    await cache.set(cacheKey, response, 300);
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  Get Single Banner
export const getSingleHomeBanner = async (req: Request, res: Response) => {
  try {
    const banner = await HomeBanner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }
    return res.status(200).json({ success: true, data: banner });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  Update Banner
export const updateHomeBanner = async (req: Request, res: Response) => {
  try {
    const { title, Description, Link_URL, active, sliderFor } = req.body;
    const files = req.files as Express.Multer.File[];

    let imageUrls: string[] = [];

    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        const imageUrl = await uploadClouinary(file.buffer);
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return imageUrl;
      });

      imageUrls = await Promise.all(uploadPromises);
    }

    const updatedBanner = await HomeBanner.findByIdAndUpdate(
      req.params.id,
      {
        title,
        Description,
        Link_URL,
        active,
        sliderFor,
        ...(imageUrls.length > 0 && { images: imageUrls }),
      },
      { new: true }
    );

    if (!updatedBanner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    await cache.delByPrefix("banners:home:");
    await cache.delByPrefix("homepage");
    return res.status(200).json({
      success: true,
      message: "Home banner updated successfully",
      data: updatedBanner,
    });
  } catch (error: any) {
    console.error("Update HomeBanner error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  Delete Banner
export const deleteHomeBanner = async (req: Request, res: Response) => {
  try {
    const banner = await HomeBanner.findByIdAndDelete(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }
    await cache.delByPrefix("banners:home:");
    await cache.delByPrefix("homepage");
    return res.status(200).json({ success: true, message: "Banner deleted successfully" });
  } catch (error: any) {
    console.error("Delete HomeBanner error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
