import { Request, Response } from "express";
import uploadClouinary from "../../utils/cloudinary";
import { CartModel } from "../cart/cart.model";
import { Review } from "../review/review.model";
import { WishlistModel } from "../wishlist/wishlist.model";
import productModel from "./product.model";
import CategoryModel from "../category/category.model";
import SubCategoryModel from "../subcategory/subcategory.model";

interface PaginationRequest extends Request {
  body: {
    page?: number;
    limit?: number;
    search?: string;
    id?: string;
    categoryId?: string;
    subCategoryId?: string;
    brand?: string;
    gender?: string;
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
    sortBy?: string;
    productId?: string;
    _id?: string;
    publish?: boolean;
    productName?: string;
    description?: string;
    category?: string[];
    subCategory?: string[];
    featured?: boolean;
    productWeight?: string[];
    productSize?: string[];
    color?: string[];
    price?: number;
    productStock?: number;
    productRank?: number;
    discount?: number;
    ratings?: number;
    tags?: string[];
    more_details?: any;
    video_link?: string;
  };
}

// Create Product
export const createProductController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const normalizeArray = (val: any) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        if (val.startsWith("[") && val.endsWith("]")) {
          try {
            return JSON.parse(val);
          } catch (e) {
            return [val];
          }
        }
        return [val];
      }
      return [val];
    };

    const {
      productName,
      description,
      category,
      subCategory,
      featured,
      brand,
      productWeight,
      productSize,
      color,
      price,
      productStock,
      productRank,
      discount,
      ratings,
      tags,
      more_details,
      publish,
      video_link,
      gender,
    } = req.body;

    // Validation
    if (!productName) {
      res.status(400).json({
        message: "Enter required fields",
        error: true,
        success: false,
      });
      return;
    }

    // ✅ Multiple image & video upload
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let imageUrls: string[] = [];
    let videoUrls: string[] = [];

    if (files && files.images && files.images.length > 0) {
      for (const file of files.images) {
        if (file.buffer) {
          const uploadedUrl = await uploadClouinary(file.buffer);
          imageUrls.push(uploadedUrl);
        }
      }
    }

    if (files && files.video && files.video.length > 0) {
      for (const file of files.video) {
        if (file.buffer) {
          const uploadedUrl = await uploadClouinary(file.buffer);
          videoUrls.push(uploadedUrl);
        }
      }
    }

    // Auto-generate unique SKU
    const sku = `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Product create and save
    const product = await productModel.create({
      productName,
      description,
      category: normalizeArray(category),
      subCategory: normalizeArray(subCategory),
      featured: String(featured) === "true",
      brand,
      productWeight: normalizeArray(productWeight),
      productSize: normalizeArray(productSize),
      color: normalizeArray(color),
      price: price ? parseFloat(price) : null,
      productStock: productStock ? parseInt(productStock) : null,
      productRank: productRank ? parseInt(productRank) : 0,
      discount: discount ? parseFloat(discount) : null,
      ratings: ratings ? parseFloat(ratings) : 5,
      tags: normalizeArray(tags),
      images: imageUrls,
      video: videoUrls,
      video_link: video_link,
      more_details: typeof more_details === 'string' ? JSON.parse(more_details) : more_details,
      publish: publish === undefined ? true : String(publish) === "true",
      gender: gender || "unisex",
      sku,
    });

    res.json({
      message: "Product Created Successfully",
      data: product,
      error: false,
      success: true,
    });
  } catch (error: any) {
    // Duplicate SKU handle
    if (error.code === 11000) {
      res.status(400).json({
        message: "SKU must be unique",
        error: true,
        success: false,
      });
      return;
    }

    res.status(500).json({
      message: error.message || "Server Error",
      error: true,
      success: false,
    });
  }
};

// Helper to build product query
const buildProductQuery = (body: any) => {
  const { search, categoryId, subCategoryId, brand, gender, minPrice, maxPrice, rating, publish } = body;
  let query: any = {};

  // For public endpoints, only show published products
  if (publish === undefined) {
    query.publish = true;
  } else {
    query.publish = publish;
  }

  if (search) {
    // Use MongoDB Text Index for much faster full-text search
    query.$text = { $search: search };
  }

  if (categoryId && categoryId !== "all") {
    query.category = { $in: [categoryId] };
  }

  if (subCategoryId && subCategoryId !== "all") {
    query.subCategory = { $in: [subCategoryId] };
  }

  if (brand && brand !== "all") {
    query.brand = { $regex: brand, $options: "i" };
  }

  if (gender && gender !== "all" && gender !== "") {
    query.gender = gender;
  }

  // Price Filter
  const min = parseFloat(minPrice);
  const max = parseFloat(maxPrice);

  if (!isNaN(min) || !isNaN(max)) {
    query.price = {};
    if (!isNaN(min)) query.price.$gte = min;
    if (!isNaN(max)) query.price.$lte = max;
  }

  if (rating && rating > 0) {
    query.ratings = { $gte: Number(rating) };
  }

  return query;
};

// Helper for sorting
const getSortOption = (sortBy: string | undefined) => {
  switch (sortBy) {
    case "price-low":
      return { price: 1 };
    case "price-high":
      return { price: -1 };
    case "rating":
      return { ratings: -1 };
    case "newest":
    case "name":
      return { createdAt: -1 };
    case "discount":
      return { discount: -1 };
    case "alphabetical":
      return { productName: 1 };
    default:
      return { createdAt: -1 };
  }
};

const isObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

// Get Products (with pagination & advanced filters)
export const getProductController = async (
  req: PaginationRequest,
  res: Response
): Promise<void> => {
  try {
    let { page, limit, sortBy, categoryId, subCategoryId } = req.body;
    page = Number(page) || 1;
    limit = Number(limit) || 10;

    // Resolve category slug to ID if needed
    if (categoryId && categoryId !== "all" && !isObjectId(categoryId)) {
      const category = await CategoryModel.findOne({ $or: [{ slug: categoryId }, { name: categoryId }] });
      if (category) {
        req.body.categoryId = category._id.toString();
      } else {
        req.body.categoryId = "000000000000000000000000";
      }
    }

    // Resolve subcategory slug to ID if needed
    if (subCategoryId && subCategoryId !== "all" && !isObjectId(subCategoryId)) {
      const subCategory = await SubCategoryModel.findOne({ $or: [{ slug: subCategoryId }, { name: subCategoryId }] });
      if (subCategory) {
        req.body.subCategoryId = subCategory._id.toString();
      } else {
        req.body.subCategoryId = "000000000000000000000000";
      }
    }

    const query = buildProductQuery(req.body);
    const sort = getSortOption(sortBy);
    const skip = (page - 1) * limit;

    // Use estimatedDocumentCount for the root "/" or "/shop" page with no filters
    // to avoid a full collection scan which can take >300ms on large datasets.
    const isQueryEmpty = Object.keys(query).length === 1 && query.publish === true;

    const [data, totalCount] = await Promise.all([
      productModel.find(query)
        .select("productName description brand price productStock productRank discount ratings images publish createdAt gender sku category subCategory")
        .sort(sort as any)
        .skip(skip)
        .limit(limit)
        .populate("category subCategory", "name slug")
        .lean(),
      isQueryEmpty ? productModel.estimatedDocumentCount() : productModel.countDocuments(query),
    ]);

    res.json({
      message: "Product data retrieved successfully",
      error: false,
      success: true,
      data,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      page,
      limit,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Server Error",
      error: true,
      success: false,
    });
  }
};

// Get Products by Category
export const getProductByCategory = async (
  req: PaginationRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ message: "Provide category id", error: true, success: false });
      return;
    }

    let finalId = id;
    if (!isObjectId(id)) {
      const category = await CategoryModel.findOne({ $or: [{ slug: id }, { name: id }] });
      if (category) finalId = category._id.toString();
    }

    const data = await productModel.find({ category: { $in: [finalId] }, publish: true })
      .select("productName description brand price productStock productRank discount ratings images")
      .limit(15)
      .populate("category subCategory", "name slug")
      .lean();

    res.json({ message: "Category product list", data, error: false, success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message || error, error: true, success: false });
  }
};

// Get Products by Category & SubCategory
export const getProductByCategoryAndSubCategory = async (
  req: PaginationRequest,
  res: Response
): Promise<void> => {
  try {
    let { categoryId, subCategoryId, page, limit } = req.body;
    if (!categoryId || !subCategoryId) {
      res.status(400).json({ message: "Provide categoryId and subCategoryId", error: true, success: false });
      return;
    }
    page = Number(page) || 1;
    limit = Number(limit) || 10;

    let finalCatId = categoryId;
    if (!isObjectId(categoryId)) {
      const cat = await CategoryModel.findOne({ $or: [{ slug: categoryId }, { name: categoryId }] });
      if (cat) finalCatId = cat._id.toString();
    }

    let finalSubId = subCategoryId;
    if (!isObjectId(subCategoryId)) {
      const sub = await SubCategoryModel.findOne({ $or: [{ slug: subCategoryId }, { name: subCategoryId }] });
      if (sub) finalSubId = sub._id.toString();
    }

    const query = { category: { $in: [finalCatId] }, subCategory: { $in: [finalSubId] }, publish: true };
    const skip = (page - 1) * limit;

    const [data, totalCount] = await Promise.all([
      productModel.find(query)
        .select("productName description brand price productStock productRank discount ratings images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("category subCategory", "name slug")
        .lean(),
      productModel.countDocuments(query),
    ]);

    res.json({
      message: "Product list retrieved successfully",
      data,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      page,
      limit,
      success: true,
      error: false,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || error, error: true, success: false });
  }
};

export const getProductDetails = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const product = await productModel.findOne({ _id: productId })
      .populate("category subCategory", "name slug")
      .lean();
    res.json({ message: "Product details", data: product, error: false, success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message || error, error: true, success: false });
  }
};

// Update Product
export const updateProductDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { _id } = req.body;
    if (!_id) {
      res.status(400).json({ message: "Provide product _id", error: true, success: false });
      return;
    }
    const normalizeArray = (val: any) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      return [val];
    };

    const updateData = { ...req.body };
    if (updateData.tags) updateData.tags = normalizeArray(updateData.tags);
    if (updateData.category) updateData.category = normalizeArray(updateData.category);
    if (updateData.subCategory) updateData.subCategory = normalizeArray(updateData.subCategory);
    if (updateData.productWeight) updateData.productWeight = normalizeArray(updateData.productWeight);
    if (updateData.productSize) updateData.productSize = normalizeArray(updateData.productSize);
    if (updateData.color) updateData.color = normalizeArray(updateData.color);

    const updateProduct = await productModel.findByIdAndUpdate(_id, { $set: updateData }, { new: true });
    res.json({ message: "Updated successfully", data: updateProduct, error: false, success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message || error, error: true, success: false });
  }
};

export const deleteProductDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { _id } = req.body;
    if (!_id) {
      res.status(400).json({ message: "Provide _id", error: true, success: false });
      return;
    }
    await Promise.all([
      CartModel.updateMany({ "products.productId": _id }, { $pull: { products: { productId: _id } } }),
      WishlistModel.updateMany({ "products.productId": _id }, { $pull: { products: { productId: _id } } }),
      Review.deleteMany({ productId: _id }),
      productModel.deleteOne({ _id })
    ]);
    res.json({ message: "Delete successfully", error: false, success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message || error, error: true, success: false });
  }
};

// Search Product
export const searchProduct = async (
  req: PaginationRequest,
  res: Response
): Promise<void> => {
  return getProductController(req, res);
};
