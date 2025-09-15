import { Request, Response } from "express";
import ProductModel from "./product.model";
import { IProduct } from "./type";

interface PaginationRequest extends Request {
  body: {
    page?: number;
    limit?: number;
    search?: string;
    id?: string;
    categoryId?: string[];
    subCategoryId?: string[];
    productId?: string;
    _id?: string;
  };
}

// Create Product
export const createProductController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      image,
      category,
      subCategory,
      brand,
      tags,
      featured,
      unit,
      weight,
      size,
      rank,
      stock,
      price,
      discount,
      description,
      more_details,
      publish,
    } = req.body as IProduct;

    // Validation
    if (
      !name ||
      !image?.[0] ||
      !category?.[0] ||
      !subCategory?.[0] ||
      !unit ||
      !price ||
      !description
    ) {
      res.status(400).json({
        message: "Enter required fields",
        error: true,
        success: false,
      });
      return;
    }

  

    // Product create and save
    const product = await ProductModel.create({
      name,
      image,
      category,
      subCategory,
      brand,
      tags,
      featured,
      unit,
      weight,
      size,
      rank,
      stock,
      price,
      discount,
      description,
      more_details,
      publish,
    });

    res.json({
      message: "Product Created Successfully",
      data: product,
      error: false,
      success: true,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
};


// Get Products (with pagination & search)
export const getProductController = async (
  req: PaginationRequest,
  res: Response
): Promise<void> => {
  try {
    let { page, limit, search } = req.body;
    page = page || 1;
    limit = limit || 10;

    const query = search
      ? { $text: { $search: search } }
      : {};

    const skip = (page - 1) * limit;

    const [data, totalCount] = await Promise.all([
      ProductModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("category subCategory"),
      ProductModel.countDocuments(query),
    ]);

    res.json({
      message: "Product data",
      error: false,
      success: true,
      totalCount,
      totalNoPage: Math.ceil(totalCount / limit),
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || error,
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
      res.status(400).json({
        message: "Provide category id",
        error: true,
        success: false,
      });
      return;
    }

    const product = await ProductModel.find({
      category: { $in: id },
    }).limit(15);

    res.json({
      message: "Category product list",
      data: product,
      error: false,
      success: true,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
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
      res.status(400).json({
        message: "Provide categoryId and subCategoryId",
        error: true,
        success: false,
      });
      return;
    }
    page = page || 1;
    limit = limit || 10;

    const query = {
      category: { $in: categoryId },
      subCategory: { $in: subCategoryId },
    };

    const skip = (page - 1) * limit;

    const [data, dataCount] = await Promise.all([
      ProductModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ProductModel.countDocuments(query),
    ]);

    res.json({
      message: "Product list",
      data,
      totalCount: dataCount,
      page,
      limit,
      success: true,
      error: false,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
};

// Get Product Details
export const getProductDetails = async (
  req: PaginationRequest,
  res: Response
): Promise<void> => {
  try {
    const { productId } = req.body;

    const product = await ProductModel.findOne({ _id: productId });

    res.json({
      message: "Product details",
      data: product,
      error: false,
      success: true,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
};

// Update Product
export const updateProductDetails = async (
  req: PaginationRequest,
  res: Response
): Promise<void> => {
  try {
    const { _id } = req.body;

    if (!_id) {
      res.status(400).json({
        message: "Provide product _id",
        error: true,
        success: false,
      });
      return;
    }

    const updateProduct = await ProductModel.updateOne(
      { _id },
      { ...req.body }
    );

    res.json({
      message: "Updated successfully",
      data: updateProduct,
      error: false,
      success: true,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
};

// Delete Product
export const deleteProductDetails = async (
  req: PaginationRequest,
  res: Response
): Promise<void> => {
  try {
    const { _id } = req.body;

    if (!_id) {
      res.status(400).json({
        message: "Provide _id",
        error: true,
        success: false,
      });
      return;
    }

    const deleteProduct = await ProductModel.deleteOne({ _id });

    res.json({
      message: "Delete successfully",
      error: false,
      success: true,
      data: deleteProduct,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
};

// Search Product
export const searchProduct = async (
  req: PaginationRequest,
  res: Response
): Promise<void> => {
  try {
    let { search, page, limit } = req.body;
    page = page || 1;
    limit = limit || 10;

    const query = search ? { $text: { $search: search } } : {};
    const skip = (page - 1) * limit;

    const [data, dataCount] = await Promise.all([
      ProductModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("category subCategory"),
      ProductModel.countDocuments(query),
    ]);

    res.json({
      message: "Product data",
      error: false,
      success: true,
      data,
      totalCount: dataCount,
      totalPage: Math.ceil(dataCount / limit),
      page,
      limit,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
};
