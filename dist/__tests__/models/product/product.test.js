"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("../../setup");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../../../config"));
const product_routes_1 = __importDefault(require("../../../models/product/product.routes"));
const category_model_1 = __importDefault(require("../../../models/category/category.model"));
const subcategory_model_1 = __importDefault(require("../../../models/subcategory/subcategory.model"));
const product_model_1 = __importDefault(require("../../../models/product/product.model"));
const user_model_1 = __importDefault(require("../../../models/user/user.model"));
const cache_1 = require("../../../utils/cache");
let mongoServer;
let app;
let adminToken;
let testCategory;
let testSubCategory;
let testAdmin;
beforeAll(async () => {
    mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create();
    await mongoose_1.default.connect(mongoServer.getUri());
    app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(require("cookie-parser")());
    app.use("/api/products", product_routes_1.default);
    testAdmin = await user_model_1.default.create({
        name: "Admin",
        email: "admin@test.com",
        password: "password123",
        role: "ADMIN",
    });
    adminToken = jsonwebtoken_1.default.sign({ userId: testAdmin._id.toString() }, config_1.default.jwtsecret, { expiresIn: "30d" });
    testCategory = await category_model_1.default.create({
        name: "Electronics",
        image: "http://example.com/cat.jpg",
    });
    testSubCategory = await subcategory_model_1.default.create({
        name: "Phones",
        image: "http://example.com/sub.jpg",
        category: testCategory._id,
    });
});
afterAll(async () => {
    await mongoose_1.default.disconnect();
    await mongoServer.stop();
});
beforeEach(async () => {
    await cache_1.cache.delByPrefix("");
    const collections = mongoose_1.default.connection.collections;
    for (const key in collections) {
        if (key !== "users" && key !== "categories" && key !== "subcategories") {
            await collections[key].deleteMany({});
        }
    }
});
describe("Product Controllers", () => {
    const createTestProduct = async (overrides = {}) => {
        return product_model_1.default.create({
            productName: "Test Product",
            description: "A test product",
            category: [testCategory._id],
            subCategory: [testSubCategory._id],
            price: 500,
            productStock: 10,
            publish: true,
            ...overrides,
        });
    };
    describe("POST /api/products/get", () => {
        it("should return products with pagination", async () => {
            await createTestProduct();
            await createTestProduct({ productName: "Second Product" });
            const res = await (0, supertest_1.default)(app)
                .post("/api/products/get")
                .send({ page: 1, limit: 10 });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.totalCount).toBeGreaterThanOrEqual(2);
        });
        it("should return empty array when no products exist", async () => {
            const res = await (0, supertest_1.default)(app)
                .post("/api/products/get")
                .send({ page: 1, limit: 10 });
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
        });
    });
    describe("POST /api/products/get-product-by-category", () => {
        it("should return products filtered by category", async () => {
            await createTestProduct();
            const res = await (0, supertest_1.default)(app)
                .post("/api/products/get-product-by-category")
                .send({ id: testCategory._id.toString() });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        });
        it("should return 400 if no category id provided", async () => {
            const res = await (0, supertest_1.default)(app)
                .post("/api/products/get-product-by-category")
                .send({});
            expect(res.status).toBe(400);
            expect(res.body.error).toBe(true);
        });
    });
    describe("POST /api/products/get-pruduct-by-category-and-subcategory", () => {
        it("should return products filtered by both category and subcategory", async () => {
            await createTestProduct();
            const res = await (0, supertest_1.default)(app)
                .post("/api/products/get-pruduct-by-category-and-subcategory")
                .send({
                categoryId: testCategory._id.toString(),
                subCategoryId: testSubCategory._id.toString(),
            });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        });
        it("should return 400 if missing categoryId or subCategoryId", async () => {
            const res = await (0, supertest_1.default)(app)
                .post("/api/products/get-pruduct-by-category-and-subcategory")
                .send({ categoryId: testCategory._id.toString() });
            expect(res.status).toBe(400);
            expect(res.body.error).toBe(true);
        });
    });
    describe("POST /api/products/get-product-details/:productId", () => {
        it("should return single product details", async () => {
            const product = await createTestProduct();
            const res = await (0, supertest_1.default)(app)
                .post(`/api/products/get-product-details/${product._id}`);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
        });
    });
    describe("POST /api/products/search-product", () => {
        it("should search products by name", async () => {
            await createTestProduct({ productName: "Wireless Headphones" });
            await createTestProduct({ productName: "Bluetooth Speaker" });
            const res = await (0, supertest_1.default)(app)
                .post("/api/products/search-product")
                .send({ search: "Wireless" });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
