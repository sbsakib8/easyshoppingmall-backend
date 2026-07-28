import mongoose from "mongoose";
import { Request, Response } from "express";
import { cache } from "../../utils/cache";
import HomeBanner from "../banners/homeBanner/homeBanner.model";
import CategoryModel from "../category/category.model";
import SubCategoryModel from "../subcategory/subcategory.model";
import productModel from "../product/product.model";
import WebsiteInfo from "../content/websiteInfo/websiteinfo.model";
import Notice from "../notice/notice.model";

const HOMEPAGE_CACHE_TTL = 300; // 5 minutes - invalidation handles freshness
const POPULAR_CACHE_TTL = 300;
const MAX_POPULAR_PRODUCTS = 80;
const PRODUCTS_PER_SUBCATEGORY = 5;

const isObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

const POPULAR_SELECT =
  "productName brand price dropshippingPrice discount ratings images isBoost createdAt sku category subCategory productRank featured";

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
          .select("title Description Link_URL images active sliderFor")
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
          .select("title Description Link_URL images active sliderFor")
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

// ─── Popular Products (subcategory-grouped, paginated) ────────────────────────

interface PopularProductsRequest extends Request {
  body: {
    page?: number;
    limit?: number;
    categoryId?: string;
  };
}

// Shared: build the "All" tab popular products list (5 per subcategory, round-robin, max 80)
const buildAllPopularProducts = async (): Promise<any[]> => {
  const subCategories = await SubCategoryModel.find({ isActive: true })
    .select("_id")
    .lean();
  const subCatIds = subCategories.map((s) => s._id);

  if (subCatIds.length === 0) return [];

  const aggregation = await productModel.aggregate([
    {
      $match: {
        publish: true,
        subCategory: { $in: subCatIds },
      },
    },
    { $unwind: "$subCategory" },
    { $match: { subCategory: { $in: subCatIds } } },
    { $sort: { productRank: -1, ratings: -1, createdAt: -1 } },
    {
      $group: {
        _id: "$subCategory",
        products: { $push: "$$ROOT" },
      },
    },
    { $project: { _id: 1, products: { $slice: ["$products", PRODUCTS_PER_SUBCATEGORY] } } },
    { $unwind: "$products" },
    { $replaceRoot: { newRoot: "$products" } },
    { $limit: MAX_POPULAR_PRODUCTS },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
        pipeline: [{ $project: { name: 1, slug: 1 } }],
      },
    },
    {
      $lookup: {
        from: "subcategories",
        localField: "subCategory",
        foreignField: "_id",
        as: "subCategory",
        pipeline: [{ $project: { name: 1, slug: 1 } }],
      },
    },
    {
      $project: {
        productName: 1, brand: 1, price: 1, dropshippingPrice: 1,
        discount: 1, ratings: 1, images: 1, isBoost: 1, createdAt: 1,
        sku: 1, category: 1, subCategory: 1, productRank: 1, featured: 1,
      },
    },
  ]);

  // Round-robin interleave by subCategory
  const bySubCat = new Map<string, any[]>();
  for (const product of aggregation) {
    let subCatKey = "OTHER";
    if (Array.isArray(product.subCategory) && product.subCategory.length > 0) {
      const sc = product.subCategory[0];
      subCatKey = typeof sc === "object" ? String(sc._id || sc) : String(sc);
    } else if (product.subCategory && typeof product.subCategory === "object") {
      subCatKey = String((product.subCategory as any)._id || product.subCategory);
    }
    if (!bySubCat.has(subCatKey)) bySubCat.set(subCatKey, []);
    bySubCat.get(subCatKey)!.push(product);
  }

  const interleaved: any[] = [];
  const subCatKeys = Array.from(bySubCat.keys());
  const maxLen = Math.max(...subCatKeys.map((k) => bySubCat.get(k)!.length));
  for (let i = 0; i < maxLen; i++) {
    for (const key of subCatKeys) {
      const arr = bySubCat.get(key)!;
      if (i < arr.length) interleaved.push(arr[i]);
    }
  }

  return interleaved.slice(0, MAX_POPULAR_PRODUCTS);
};

// Cache warming - pre-load popular products on startup
export const warmPopularProductsCache = async (): Promise<void> => {
  try {
    const cacheKey = "popular-products:all";
    const existing = await cache.get(cacheKey);
    if (existing) return;

    const products = await buildAllPopularProducts();
    const response = {
      data: { products, totalCount: products.length, totalPages: 1, page: 1, limit: MAX_POPULAR_PRODUCTS },
    };
    await cache.set(cacheKey, response, POPULAR_CACHE_TTL);
    console.log("[Cache] Popular products cache warmed successfully");
  } catch (error: any) {
    console.error("[Cache] Popular products cache warming failed:", error.message);
  }
};

export const getPopularProducts = async (
  req: PopularProductsRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 20, categoryId } = req.body;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(80, Math.max(1, Number(limit)));
    const isAllTab = !categoryId || categoryId === "all";

    // ── "All" tab: 5 per subcategory, round-robin, max 80 ──
    if (isAllTab) {
      const cacheKey = "popular-products:all";
      const cached = await cache.get(cacheKey);
      if (cached) {
        const allProducts = (cached as any).data.products;
        const total = allProducts.length;
        const totalPages = Math.ceil(total / limitNum);
        const skip = (pageNum - 1) * limitNum;
        const paginated = allProducts.slice(skip, skip + limitNum);

        res.set("Cache-Control", "private, no-cache");
        res.json({
          message: "Popular products retrieved successfully",
          error: false,
          success: true,
          data: { products: paginated, totalCount: total, totalPages, page: pageNum, limit: limitNum },
        });
        return;
      }

      // Cache miss - build the full list
      const finalProducts = await buildAllPopularProducts();
      const totalCount = finalProducts.length;

      await cache.set(cacheKey, { data: { products: finalProducts } }, POPULAR_CACHE_TTL);

      const skip = (pageNum - 1) * limitNum;
      const paginated = finalProducts.slice(skip, skip + limitNum);

      res.set("Cache-Control", "private, no-cache");
      res.json({
        message: "Popular products retrieved successfully",
        error: false,
        success: true,
        data: {
          products: paginated,
          totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
          page: pageNum,
          limit: limitNum,
        },
      });
      return;
    }

    // ── Specific category tab ──
    let resolvedCategoryId = categoryId;
    if (!isObjectId(categoryId)) {
      const cat = await CategoryModel.findOne({
        $or: [{ slug: categoryId }, { name: { $regex: new RegExp(`^${categoryId}$`, "i") } }],
      });
      if (cat) {
        resolvedCategoryId = cat._id.toString();
      } else {
        res.json({
          message: "Popular products retrieved successfully",
          error: false,
          success: true,
          data: { products: [], totalCount: 0, totalPages: 0, page: pageNum, limit: limitNum },
        });
        return;
      }
    }

    const catCacheKey = `popular-products:cat:${resolvedCategoryId}:p${pageNum}:l${limitNum}`;
    const catCached = await cache.get(catCacheKey);
    if (catCached) {
      res.set("Cache-Control", "private, no-cache");
      res.json(catCached);
      return;
    }

    // Get subcategories for this category
    const subCats = await SubCategoryModel.find({
      category: new mongoose.Types.ObjectId(resolvedCategoryId),
      isActive: true,
    })
      .select("_id")
      .lean();
    const subCatIds = subCats.map((s) => s._id);

    const query: any = {
      publish: true,
    };
    if (subCatIds.length > 0) {
      query.subCategory = { $in: subCatIds };
    } else {
      // Fallback: filter by category if no subcategories found
      query.category = { $in: [new mongoose.Types.ObjectId(resolvedCategoryId)] };
    }

    const skip = (pageNum - 1) * limitNum;
    const [products, totalCount] = await Promise.all([
      productModel
        .find(query)
        .select(POPULAR_SELECT)
        .sort({ productRank: -1, ratings: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("category subCategory", "name slug")
        .lean(),
      productModel.countDocuments(query),
    ]);

    const response = {
      message: "Popular products retrieved successfully",
      error: false,
      success: true,
      data: {
        products,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        page: pageNum,
        limit: limitNum,
      },
    };

    await cache.set(catCacheKey, response, POPULAR_CACHE_TTL);
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
