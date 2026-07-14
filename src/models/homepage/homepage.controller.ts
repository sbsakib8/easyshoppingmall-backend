import { Request, Response } from "express";
import { cache } from "../../utils/cache";
import HomeBanner from "../banners/homeBanner/homeBanner.model";
import CategoryModel from "../category/category.model";
import SubCategoryModel from "../subcategory/subcategory.model";
import productModel from "../product/product.model";
import WebsiteInfo from "../content/websiteInfo/websiteinfo.model";
import Notice from "../notice/notice.model";

const HOMEPAGE_CACHE_TTL = 300; // 5 minutes - invalidation handles freshness

export const getHomepageData = async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = "homepage";
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.set("Cache-Control", "private, no-cache");
      res.json(cached);
      return;
    }

    // Fetch all homepage data in parallel
    const [banners, categories, subCategories, featuredProducts, websiteInfo, activeNotices] =
      await Promise.all([
        HomeBanner.find({ active: true, sliderFor: "USER" })
          .select("title Description Link_URL images status sliderFor")
          .sort({ createdAt: -1 })
          .lean(),

        CategoryModel.find({ isActive: true })
          .select("name slug image icon")
          .sort({ createdAt: -1 })
          .lean(),

        SubCategoryModel.find({ isActive: true })
          .select("name slug image icon category")
          .populate("category", "name slug")
          .sort({ createdAt: -1 })
          .lean(),

        productModel
          .find({ publish: true, $or: [{ isBoost: true }, { featured: true }] })
          .select(
            "productName brand price dropshippingPrice discount ratings images isBoost createdAt sku category subCategory"
          )
          .sort({ productRank: -1, ratings: -1 })
          .limit(20)
          .populate("category subCategory", "name slug")
          .lean(),

        WebsiteInfo.findOne().sort({ createdAt: -1 })
          .select("address number email socialLinks")
          .lean(),

        Notice.find({ isActive: true })
          .select("title description keyPoints button priority")
          .sort({ priority: -1, createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

    const response = {
      message: "Homepage data retrieved successfully",
      error: false,
      success: true,
      data: {
        banners,
        categories,
        subCategories,
        featuredProducts,
        websiteInfo,
        notices: activeNotices,
      },
    };

    await cache.set(cacheKey, response, HOMEPAGE_CACHE_TTL);
    res.set("Cache-Control", "private, no-cache");
    res.json(response);
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Server Error",
      error: true,
      success: false,
    });
  }
};

// Cache warming - pre-load homepage data on startup
export const warmHomepageCache = async (): Promise<void> => {
  try {
    const cacheKey = "homepage";
    const existing = await cache.get(cacheKey);
    if (existing) return;

    const [banners, categories, subCategories, featuredProducts, websiteInfo, activeNotices] =
      await Promise.all([
        HomeBanner.find({ active: true, sliderFor: "USER" })
          .select("title Description Link_URL images status sliderFor")
          .sort({ createdAt: -1 })
          .lean(),
        CategoryModel.find({ isActive: true })
          .select("name slug image icon")
          .sort({ createdAt: -1 })
          .lean(),
        SubCategoryModel.find({ isActive: true })
          .select("name slug image icon category")
          .populate("category", "name slug")
          .sort({ createdAt: -1 })
          .lean(),
        productModel
          .find({ publish: true, $or: [{ isBoost: true }, { featured: true }] })
          .select(
            "productName brand price dropshippingPrice discount ratings images isBoost createdAt sku category subCategory"
          )
          .sort({ productRank: -1, ratings: -1 })
          .limit(20)
          .populate("category subCategory", "name slug")
          .lean(),
        WebsiteInfo.findOne().sort({ createdAt: -1 })
          .select("address number email socialLinks")
          .lean(),
        Notice.find({ isActive: true })
          .select("title description keyPoints button priority")
          .sort({ priority: -1, createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

    const response = {
      message: "Homepage data retrieved successfully",
      error: false,
      success: true,
      data: {
        banners,
        categories,
        subCategories,
        featuredProducts,
        websiteInfo,
        notices: activeNotices,
      },
    };

    await cache.set(cacheKey, response, HOMEPAGE_CACHE_TTL);
    console.log("[Cache] Homepage cache warmed successfully");
  } catch (error: any) {
    console.error("[Cache] Homepage cache warming failed:", error.message);
  }
};
