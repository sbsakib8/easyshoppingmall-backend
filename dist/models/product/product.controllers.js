"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageSearchProduct = exports.searchProduct = exports.deleteProductDetails = exports.updateProductDetails = exports.getProductDetails = exports.getProductByCategoryAndSubCategory = exports.getProductByCategory = exports.getProductController = exports.createProductController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const sharp_1 = __importDefault(require("sharp"));
const cloudinary_1 = __importDefault(require("../../utils/cloudinary"));
const cart_model_1 = require("../cart/cart.model");
const review_model_1 = require("../review/review.model");
const wishlist_model_1 = require("../wishlist/wishlist.model");
const product_model_1 = __importDefault(require("./product.model"));
const category_model_1 = __importDefault(require("../category/category.model"));
const subcategory_model_1 = __importDefault(require("../subcategory/subcategory.model"));
const cache_1 = require("../../utils/cache");
// Create Product
const createProductController = async (req, res) => {
    try {
        const normalizeArray = (val) => {
            if (!val)
                return [];
            if (Array.isArray(val))
                return val;
            if (typeof val === "string") {
                if (val.startsWith("[") && val.endsWith("]")) {
                    try {
                        return JSON.parse(val);
                    }
                    catch (e) {
                        return [val];
                    }
                }
                return [val];
            }
            return [val];
        };
        const { productName, description, category, subCategory, featured, brand, productWeight, productSize, color, price, dropshippingPrice, productStock, productRank, discount, ratings, tags, productStatus, more_details, publish, isBoost, video_link, gender, } = req.body;
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
        const files = req.files;
        let imageUrls = [];
        let videoUrls = [];
        if (files && files.images && files.images.length > 0) {
            for (const file of files.images) {
                if (file.buffer) {
                    const uploadedUrl = await (0, cloudinary_1.default)(file.buffer);
                    imageUrls.push(uploadedUrl);
                }
            }
        }
        if (files && files.video && files.video.length > 0) {
            for (const file of files.video) {
                if (file.buffer) {
                    const uploadedUrl = await (0, cloudinary_1.default)(file.buffer);
                    videoUrls.push(uploadedUrl);
                }
            }
        }
        // Auto-generate unique SKU
        const sku = `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        // Product create and save
        const product = await product_model_1.default.create({
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
            dropshippingPrice: dropshippingPrice !== undefined && dropshippingPrice !== "" ? parseFloat(dropshippingPrice) : null,
            productStock: productStock ? parseInt(productStock) : null,
            productRank: productRank ? parseInt(productRank) : 0,
            discount: discount ? parseFloat(discount) : null,
            ratings: ratings ? parseFloat(ratings) : 5,
            tags: normalizeArray(tags),
            productStatus: normalizeArray(productStatus).filter((s) => ['hot', 'cold'].includes(s)),
            images: imageUrls,
            video: videoUrls,
            video_link: video_link,
            more_details: typeof more_details === 'string' ? JSON.parse(more_details) : more_details,
            publish: publish === undefined ? true : String(publish) === "true",
            isBoost: String(isBoost) === "true",
            gender: gender || "unisex",
            sku,
        });
        res.json({
            message: "Product Created Successfully",
            data: product,
            error: false,
            success: true,
        });
        cache_1.memoryCache.clear();
    }
    catch (error) {
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
exports.createProductController = createProductController;
// Helper to build product query (works with both req.query and req.body)
const buildProductQuery = (params) => {
    const { search: rawSearch, skyTitle, q, keyword, query: searchQuery, categoryId, subCategoryId, brand, gender, minPrice, maxPrice, rating, publish } = params;
    const search = rawSearch || skyTitle || q || keyword || searchQuery;
    let query = {};
    // For public endpoints, only show published products
    if (publish === undefined) {
        query.publish = true;
    }
    else {
        query.publish = publish === 'true' || publish === true;
    }
    if (search) {
        const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&');
        const regex = new RegExp(escapeRegex(search), 'i');
        query.$or = [
            { productName: regex },
            { description: regex },
            { brand: regex },
            { tags: regex },
            { sku: regex },
        ];
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
        if (!isNaN(min))
            query.price.$gte = min;
        if (!isNaN(max))
            query.price.$lte = max;
    }
    if (rating && rating > 0) {
        query.ratings = { $gte: Number(rating) };
    }
    return query;
};
// Helper for sorting
const getSortOption = (sortBy) => {
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
const isObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
// Get Products (with pagination & advanced filters)
const getProductController = async (req, res) => {
    try {
        let { page, limit, sortBy, categoryId, subCategoryId } = req.body;
        page = Number(page) || 1;
        limit = Number(limit) || 10;
        const search = req.body.search || req.body.skyTitle || req.body.q || req.body.keyword;
        const isSearch = !!search;
        // Build cache key from body params
        const cacheKey = `products:${JSON.stringify(req.body)}`;
        const skipCache = isSearch;
        if (!skipCache) {
            const cached = cache_1.memoryCache.get(cacheKey);
            if (cached) {
                res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
                res.json(cached);
                return;
            }
        }
        // Resolve category slug to ID if needed
        if (categoryId && categoryId !== "all" && !isObjectId(categoryId)) {
            const category = await category_model_1.default.findOne({ $or: [{ slug: categoryId }, { name: categoryId }] });
            if (category) {
                req.body.categoryId = category._id.toString();
            }
            else {
                req.body.categoryId = "000000000000000000000000";
            }
        }
        // Resolve subcategory slug to ID if needed
        if (subCategoryId && subCategoryId !== "all" && !isObjectId(subCategoryId)) {
            const subCategory = await subcategory_model_1.default.findOne({ $or: [{ slug: subCategoryId }, { name: subCategoryId }] });
            if (subCategory) {
                req.body.subCategoryId = subCategory._id.toString();
            }
            else {
                req.body.subCategoryId = "000000000000000000000000";
            }
        }
        const sort = getSortOption(sortBy);
        const skip = (page - 1) * limit;
        const selectFields = "productName description brand price dropshippingPrice productStock productRank discount ratings images publish isBoost createdAt gender sku category subCategory color tags";
        if (isSearch) {
            // Phase 1: Find direct search matches
            const searchQuery = buildProductQuery(req.body);
            const directMatches = await product_model_1.default
                .find(searchQuery)
                .select(selectFields)
                .lean();
            const directIds = new Set(directMatches.map((p) => String(p._id)));
            // Collect subcategory IDs from matched products
            const relatedSubCatIds = [];
            for (const p of directMatches) {
                if (Array.isArray(p.subCategory)) {
                    for (const sc of p.subCategory) {
                        const scId = typeof sc === 'object' ? String(sc._id || sc) : String(sc);
                        if (!relatedSubCatIds.some((id) => String(id) === scId)) {
                            relatedSubCatIds.push(scId);
                        }
                    }
                }
            }
            let relatedProducts = [];
            if (relatedSubCatIds.length > 0) {
                // Phase 2: Find related products from same subcategories (excluding direct matches)
                const relatedQuery = {
                    publish: true,
                    subCategory: { $in: relatedSubCatIds.map((id) => new mongoose_1.default.Types.ObjectId(id)) },
                    _id: { $nin: [...directIds].map((id) => new mongoose_1.default.Types.ObjectId(id)) },
                };
                // Apply same category/gender/price filters if present
                if (searchQuery.category)
                    relatedQuery.category = searchQuery.category;
                if (searchQuery.gender)
                    relatedQuery.gender = searchQuery.gender;
                relatedProducts = await product_model_1.default
                    .find(relatedQuery)
                    .select(selectFields)
                    .sort({ productRank: -1, ratings: -1 })
                    .limit(Math.ceil(limit / 2))
                    .populate("category subCategory", "name slug")
                    .lean();
            }
            // Populate category/subCategory on direct matches
            const populatedDirect = await product_model_1.default
                .find({ _id: { $in: [...directIds].map((id) => new mongoose_1.default.Types.ObjectId(id)) } })
                .select(selectFields)
                .sort(sort)
                .populate("category subCategory", "name slug")
                .lean();
            // Merge: direct matches first, then related products
            const data = [...populatedDirect, ...relatedProducts].slice(0, limit);
            const totalCount = populatedDirect.length + relatedProducts.length;
            const response = {
                message: "Product data retrieved successfully",
                error: false,
                success: true,
                data,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                page,
                limit,
            };
            res.set('Cache-Control', 'no-store');
            res.json(response);
            return;
        }
        // Non-search: normal paginated listing
        const query = buildProductQuery(req.body);
        const isQueryEmpty = Object.keys(query).length === 1 && query.publish === true;
        const [data, totalCount] = await Promise.all([
            product_model_1.default.find(query)
                .select(selectFields)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate("category subCategory", "name slug")
                .lean(),
            isQueryEmpty ? product_model_1.default.estimatedDocumentCount() : product_model_1.default.countDocuments(query),
        ]);
        const response = {
            message: "Product data retrieved successfully",
            error: false,
            success: true,
            data,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            page,
            limit,
        };
        if (!skipCache) {
            cache_1.memoryCache.set(cacheKey, response, 60);
            res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
        }
        res.json(response);
    }
    catch (error) {
        res.status(500).json({
            message: error.message || "Server Error",
            error: true,
            success: false,
        });
    }
};
exports.getProductController = getProductController;
// Get Products by Category
const getProductByCategory = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            res.status(400).json({ message: "Provide category id", error: true, success: false });
            return;
        }
        const cacheKey = `products:category:${id}`;
        const cached = cache_1.memoryCache.get(cacheKey);
        if (cached) {
            res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=60');
            res.json(cached);
            return;
        }
        let finalId = id;
        if (!isObjectId(finalId)) {
            const category = await category_model_1.default.findOne({ $or: [{ slug: finalId }, { name: finalId }] });
            if (category)
                finalId = category._id.toString();
        }
        const data = await product_model_1.default.find({ category: { $in: [finalId] }, publish: true })
            .select("productName description brand price dropshippingPrice productStock productRank discount ratings images")
            .limit(15)
            .populate("category subCategory", "name slug")
            .lean();
        const response = { message: "Category product list", data, error: false, success: true };
        cache_1.memoryCache.set(cacheKey, response, 120);
        res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=60');
        res.json(response);
    }
    catch (error) {
        res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};
exports.getProductByCategory = getProductByCategory;
// Get Products by Category & SubCategory
const getProductByCategoryAndSubCategory = async (req, res) => {
    try {
        let { categoryId, subCategoryId, page, limit } = req.body;
        if (!categoryId || !subCategoryId) {
            res.status(400).json({ message: "Provide categoryId and subCategoryId", error: true, success: false });
            return;
        }
        page = Number(page) || 1;
        limit = Number(limit) || 10;
        const cacheKey = `products:cat:${categoryId}:sub:${subCategoryId}:p${page}:l${limit}`;
        const cached = cache_1.memoryCache.get(cacheKey);
        if (cached) {
            res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=60');
            res.json(cached);
            return;
        }
        let finalCatId = categoryId;
        if (!isObjectId(categoryId)) {
            const cat = await category_model_1.default.findOne({ $or: [{ slug: categoryId }, { name: categoryId }] });
            if (cat)
                finalCatId = cat._id.toString();
        }
        let finalSubId = subCategoryId;
        if (!isObjectId(subCategoryId)) {
            const sub = await subcategory_model_1.default.findOne({ $or: [{ slug: subCategoryId }, { name: subCategoryId }] });
            if (sub)
                finalSubId = sub._id.toString();
        }
        const query = { category: { $in: [finalCatId] }, subCategory: { $in: [finalSubId] }, publish: true };
        const skip = (page - 1) * limit;
        const [data, totalCount] = await Promise.all([
            product_model_1.default.find(query)
                .select("productName description brand price dropshippingPrice productStock productRank discount ratings images")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("category subCategory", "name slug")
                .lean(),
            product_model_1.default.countDocuments(query),
        ]);
        const response = {
            message: "Product list retrieved successfully",
            data,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            page,
            limit,
            success: true,
            error: false,
        };
        cache_1.memoryCache.set(cacheKey, response, 120);
        res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=60');
        res.json(response);
    }
    catch (error) {
        res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};
exports.getProductByCategoryAndSubCategory = getProductByCategoryAndSubCategory;
const getProductDetails = async (req, res) => {
    try {
        const { productId } = req.params;
        const cacheKey = `product:${productId}`;
        const cached = cache_1.memoryCache.get(cacheKey);
        if (cached) {
            res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
            res.json(cached);
            return;
        }
        const product = await product_model_1.default.findOne({ _id: productId })
            .populate("category subCategory", "name slug")
            .lean();
        const response = { message: "Product details", data: product, error: false, success: true };
        cache_1.memoryCache.set(cacheKey, response, 300);
        res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
        res.json(response);
    }
    catch (error) {
        res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};
exports.getProductDetails = getProductDetails;
// Update Product
const updateProductDetails = async (req, res) => {
    try {
        const { _id } = req.body;
        if (!_id) {
            res.status(400).json({ message: "Provide product _id", error: true, success: false });
            return;
        }
        const normalizeArray = (val) => {
            if (!val)
                return [];
            if (Array.isArray(val))
                return val;
            return [val];
        };
        const updateData = { ...req.body };
        if (updateData.tags)
            updateData.tags = normalizeArray(updateData.tags);
        if (updateData.category)
            updateData.category = normalizeArray(updateData.category);
        if (updateData.subCategory)
            updateData.subCategory = normalizeArray(updateData.subCategory);
        if (updateData.productWeight)
            updateData.productWeight = normalizeArray(updateData.productWeight);
        if (updateData.productSize)
            updateData.productSize = normalizeArray(updateData.productSize);
        if (updateData.color)
            updateData.color = normalizeArray(updateData.color);
        if (updateData.dropshippingPrice !== undefined) {
            updateData.dropshippingPrice =
                updateData.dropshippingPrice === "" || updateData.dropshippingPrice === null
                    ? null
                    : parseFloat(updateData.dropshippingPrice);
        }
        if (updateData.price !== undefined && updateData.price !== "") {
            updateData.price = parseFloat(updateData.price);
        }
        const updateProduct = await product_model_1.default.findByIdAndUpdate(_id, { $set: updateData }, { new: true });
        res.json({ message: "Updated successfully", data: updateProduct, error: false, success: true });
        cache_1.memoryCache.clear();
    }
    catch (error) {
        res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};
exports.updateProductDetails = updateProductDetails;
const deleteProductDetails = async (req, res) => {
    try {
        const { _id } = req.body;
        if (!_id) {
            res.status(400).json({ message: "Provide _id", error: true, success: false });
            return;
        }
        await Promise.all([
            cart_model_1.CartModel.updateMany({ "products.productId": _id }, { $pull: { products: { productId: _id } } }),
            wishlist_model_1.WishlistModel.updateMany({ "products.productId": _id }, { $pull: { products: { productId: _id } } }),
            review_model_1.Review.deleteMany({ productId: _id }),
            product_model_1.default.deleteOne({ _id })
        ]);
        res.json({ message: "Delete successfully", error: false, success: true });
        cache_1.memoryCache.clear();
    }
    catch (error) {
        res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};
exports.deleteProductDetails = deleteProductDetails;
// Search Product (text / sky-title search)
const searchProduct = async (req, res) => {
    // Support 'skyTitle' as an alias for 'search'
    if (req.body.skyTitle && !req.body.search) {
        req.body.search = req.body.skyTitle;
    }
    return (0, exports.getProductController)(req, res);
};
exports.searchProduct = searchProduct;
// ─── Helpers for image search ────────────────────────────────────────────────
/**
 * Map an average RGB value to a human-readable color name.
 * This list mirrors common values stored in the product `color` array.
 */
const rgbToColorName = (r, g, b) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2;
    const saturation = max === min ? 0 : (max - min) / (lightness > 127 ? 510 - max - min : max + min);
    if (saturation < 0.12) {
        if (lightness > 220)
            return "white";
        if (lightness < 45)
            return "black";
        return "gray";
    }
    // Hue
    const rn = (r - min) / (max - min + 1e-6);
    const gn = (g - min) / (max - min + 1e-6);
    const bn = (b - min) / (max - min + 1e-6);
    let hue;
    if (max === r)
        hue = 60 * ((gn - bn) % 6);
    else if (max === g)
        hue = 60 * ((bn - rn) + 2);
    else
        hue = 60 * ((rn - gn) + 4);
    if (hue < 0)
        hue += 360;
    if (hue < 15 || hue >= 345)
        return "red";
    if (hue < 40)
        return "orange";
    if (hue < 70)
        return "yellow";
    if (hue < 155)
        return "green";
    if (hue < 200)
        return "cyan";
    if (hue < 260)
        return "blue";
    if (hue < 290)
        return "purple";
    if (hue < 345)
        return "pink";
    return "red";
};
/** Return 1-3 candidate color names (primary + secondary) from image stats */
const extractColorsFromBuffer = async (buffer) => {
    const metadata = await (0, sharp_1.default)(buffer).metadata();
    const width = metadata.width || 100;
    const height = metadata.height || 100;
    // Crop the center 50% of the image to avoid white backgrounds dominating the color average
    const { channels } = await (0, sharp_1.default)(buffer)
        .extract({
        left: Math.floor(width * 0.25),
        top: Math.floor(height * 0.25),
        width: Math.floor(width * 0.5),
        height: Math.floor(height * 0.5),
    })
        .resize(50, 50, { fit: "fill" })
        .raw()
        .toBuffer({ resolveWithObject: true })
        .then(({ data, info }) => {
        const pixelCount = info.width * info.height;
        const ch = info.channels;
        let sumR = 0, sumG = 0, sumB = 0;
        for (let i = 0; i < pixelCount; i++) {
            sumR += data[i * ch];
            sumG += data[i * ch + 1];
            sumB += data[i * ch + 2];
        }
        return {
            channels: {
                r: sumR / pixelCount,
                g: sumG / pixelCount,
                b: sumB / pixelCount,
            },
        };
    });
    const primary = rgbToColorName(channels.r, channels.g, channels.b);
    // Derive a rough secondary by boosting the dominant channel
    const boosted = {
        r: Math.min(255, channels.r * 1.3),
        g: Math.min(255, channels.g * 1.3),
        b: Math.min(255, channels.b * 1.3),
    };
    const secondary = rgbToColorName(boosted.r, boosted.g, boosted.b);
    const colors = [primary];
    if (secondary !== primary)
        colors.push(secondary);
    return colors;
};
// Image Search Product
const imageSearchProduct = async (req, res) => {
    try {
        const file = req.file;
        if (!file || !file.buffer) {
            res.status(400).json({
                message: "Please upload an image file (field: searchImage)",
                error: true,
                success: false,
            });
            return;
        }
        // Extract dominant colors from the uploaded image buffer
        const colorNames = await extractColorsFromBuffer(file.buffer);
        // Build MongoDB query: products whose color, tags, or name matches the detected colors
        const regexColors = colorNames.map((c) => new RegExp(c, "i"));
        const colorQuery = {
            publish: true,
            $or: [
                { color: { $in: regexColors } },
                { tags: { $in: regexColors } },
                { productName: { $in: regexColors } }
            ]
        };
        const [colorMatches, totalByColor] = await Promise.all([
            product_model_1.default
                .find(colorQuery)
                .select("productName description brand price dropshippingPrice productStock productRank discount ratings images publish isBoost createdAt gender sku category subCategory color tags")
                .sort({ productRank: -1, ratings: -1 })
                .limit(30)
                .populate("category subCategory", "name slug")
                .lean(),
            product_model_1.default.countDocuments(colorQuery),
        ]);
        // If we got fewer than 5 results, also run a broad fallback (recent products)
        let results = colorMatches;
        if (colorMatches.length < 5) {
            const fallback = await product_model_1.default
                .find({ publish: true })
                .select("productName description brand price dropshippingPrice productStock productRank discount ratings images publish isBoost createdAt gender sku category subCategory color tags")
                .sort({ createdAt: -1 })
                .limit(20)
                .populate("category subCategory", "name slug")
                .lean();
            // Merge without duplicates
            const seenIds = new Set(colorMatches.map((p) => String(p._id)));
            const extra = fallback.filter((p) => !seenIds.has(String(p._id)));
            results = [...colorMatches, ...extra].slice(0, 30);
        }
        res.json({
            message: "Image search results",
            detectedColors: colorNames,
            data: results,
            totalCount: results.length,
            error: false,
            success: true,
        });
    }
    catch (error) {
        res.status(500).json({
            message: error.message || "Image search failed",
            error: true,
            success: false,
        });
    }
};
exports.imageSearchProduct = imageSearchProduct;
