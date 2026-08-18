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
const cart_routes_1 = __importDefault(require("../../../models/cart/cart.routes"));
const product_model_1 = __importDefault(require("../../../models/product/product.model"));
const user_model_1 = __importDefault(require("../../../models/user/user.model"));
const cart_model_1 = require("../../../models/cart/cart.model");
const category_model_1 = __importDefault(require("../../../models/category/category.model"));
const cache_1 = require("../../../utils/cache");
let mongoServer;
let app;
let userToken;
let testUser;
let testProduct;
beforeAll(async () => {
    mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create();
    await mongoose_1.default.connect(mongoServer.getUri());
    app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(require("cookie-parser")());
    app.use("/api/cart", cart_routes_1.default);
    testUser = await user_model_1.default.create({
        name: "Test User",
        email: "user@test.com",
        password: "password123",
        role: "USER",
    });
    userToken = jsonwebtoken_1.default.sign({ userId: testUser._id.toString() }, config_1.default.jwtsecret, { expiresIn: "30d" });
    const category = await category_model_1.default.create({
        name: "Electronics",
        image: "http://example.com/cat.jpg",
    });
    testProduct = await product_model_1.default.create({
        productName: "Test Product",
        description: "Test",
        category: [category._id],
        price: 500,
        productStock: 10,
        publish: true,
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
        if (key !== "users" && key !== "categories" && key !== "products") {
            await collections[key].deleteMany({});
        }
    }
});
describe("Cart Controllers", () => {
    describe("POST /api/cart/add", () => {
        it("should add item to cart", async () => {
            const res = await (0, supertest_1.default)(app)
                .post("/api/cart/add")
                .set("Cookie", [`token=${userToken}`])
                .send({
                productId: testProduct._id.toString(),
                quantity: 2,
                price: 500,
            });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.products.length).toBe(1);
        });
        it("should return 400 if missing required fields", async () => {
            const res = await (0, supertest_1.default)(app)
                .post("/api/cart/add")
                .set("Cookie", [`token=${userToken}`])
                .send({});
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
        it("should add multiple different products to cart", async () => {
            const product2 = await product_model_1.default.create({
                productName: "Product 2",
                description: "Test 2",
                price: 300,
                productStock: 5,
                publish: true,
            });
            await (0, supertest_1.default)(app)
                .post("/api/cart/add")
                .set("Cookie", [`token=${userToken}`])
                .send({ productId: testProduct._id.toString(), quantity: 1, price: 500 });
            const res = await (0, supertest_1.default)(app)
                .post("/api/cart/add")
                .set("Cookie", [`token=${userToken}`])
                .send({ productId: product2._id.toString(), quantity: 1, price: 300 });
            expect(res.status).toBe(200);
            expect(res.body.data.products.length).toBe(2);
        });
    });
    describe("GET /api/cart/:userId", () => {
        it("should return user's cart", async () => {
            await cart_model_1.CartModel.create({
                userId: testUser._id,
                products: [
                    {
                        productId: testProduct._id,
                        quantity: 2,
                        price: 500,
                        totalPrice: 1000,
                    },
                ],
                subTotalAmt: 1000,
                totalAmt: 1000,
            });
            const res = await (0, supertest_1.default)(app)
                .get(`/api/cart/${testUser._id}`)
                .set("Cookie", [`token=${userToken}`]);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
        it("should return empty cart message when no cart exists", async () => {
            const res = await (0, supertest_1.default)(app)
                .get(`/api/cart/${testUser._id}`)
                .set("Cookie", [`token=${userToken}`]);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
    describe("PUT /api/cart/update", () => {
        it("should update cart item quantity", async () => {
            const cart = await cart_model_1.CartModel.create({
                userId: testUser._id,
                products: [
                    {
                        productId: testProduct._id,
                        quantity: 1,
                        price: 500,
                        totalPrice: 500,
                    },
                ],
                subTotalAmt: 500,
                totalAmt: 500,
            });
            const res = await (0, supertest_1.default)(app)
                .put("/api/cart/update")
                .set("Cookie", [`token=${userToken}`])
                .send({
                userId: testUser._id.toString(),
                productId: testProduct._id.toString(),
                quantity: 5,
            });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
        it("should return 400 if missing required fields", async () => {
            const res = await (0, supertest_1.default)(app)
                .put("/api/cart/update")
                .set("Cookie", [`token=${userToken}`])
                .send({});
            expect(res.status).toBe(400);
        });
    });
    describe("DELETE /api/cart/remove/:userId/:productId", () => {
        it("should remove an item from cart", async () => {
            await cart_model_1.CartModel.create({
                userId: testUser._id,
                products: [
                    {
                        productId: testProduct._id,
                        quantity: 2,
                        price: 500,
                        totalPrice: 1000,
                    },
                ],
                subTotalAmt: 1000,
                totalAmt: 1000,
            });
            const res = await (0, supertest_1.default)(app)
                .delete(`/api/cart/remove/${testUser._id}/${testProduct._id}`)
                .set("Cookie", [`token=${userToken}`]);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
    describe("DELETE /api/cart/clear/:userId", () => {
        it("should clear the cart", async () => {
            await cart_model_1.CartModel.create({
                userId: testUser._id,
                products: [
                    {
                        productId: testProduct._id,
                        quantity: 2,
                        price: 500,
                        totalPrice: 1000,
                    },
                ],
                subTotalAmt: 1000,
                totalAmt: 1000,
            });
            const res = await (0, supertest_1.default)(app)
                .delete(`/api/cart/clear/${testUser._id}`)
                .set("Cookie", [`token=${userToken}`]);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.products).toEqual([]);
        });
    });
});
