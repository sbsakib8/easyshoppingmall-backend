import { Request, Response } from "express";
import { cache } from "../../utils/cache";
import HomeBanner from "../banners/homeBanner/homeBanner.model";
import CategoryModel from "../category/category.model";
import SubCategoryModel from "../subcategory/subcategory.model";
import productModel from "../product/product.model";
import WebsiteInfo from "../content/websiteInfo/websiteinfo.model";
import Notice from "../notice/notice.model";

const HOMEPAGE_CACHE_TTL = 60; // 1 minute - homepage data changes frequently

export const getHomepageData = async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = "homepage";
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=30");
      res.json(cached);
      return;
    }

    // Fetch all homepage data in parallel
    const [banners, categories, subCategories, featuredProducts, websiteInfo, activeNotices] =
      await Promise.all([
        // Home banners (active, USER slider)
        HomeBanner.find({ active: true, sliderFor: "USER" })
          .sort({ createdAt: -1 })
          .lean(),

        // All active categories
        CategoryModel.find({ isActive: true })
          .select("name slug image icon")
          .sort({ createdAt: -1 })
          .lean(),

        // All active subcategories
        SubCategoryModel.find({ isActive: true })
          .select("name slug image icon category")
          .populate("category", "name slug")
          .sort({ createdAt: -1 })
          .lean(),

        // Featured/boosted products (top 20)
        productModel
          .find({ publish: true, $or: [{ isBoost: true }, { featured: true }] })
          .select(
            "productName description brand price dropshippingPrice productStock discount ratings images isBoost createdAt gender sku category subCategory"
          )
          .sort({ productRank: -1, ratings: -1 })
          .limit(20)
          .populate("category subCategory", "name slug")
          .lean(),

        // Website info (latest)
        WebsiteInfo.findOne().sort({ createdAt: -1 }).lean(),

        // Active notices
        Notice.find({ isActive: true })
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
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=30");
    res.json(response);
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Server Error",
      error: true,
      success: false,
    });
  }
};
