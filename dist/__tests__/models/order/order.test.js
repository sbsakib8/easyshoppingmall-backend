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
const order_routes_1 = __importDefault(require("../../../models/order/order.routes"));
const order_model_1 = __importDefault(require("../../../models/order/order.model"));
const user_model_1 = __importDefault(require("../../../models/user/user.model"));
const product_model_1 = __importDefault(require("../../../models/product/product.model"));
const category_model_1 = __importDefault(require("../../../models/category/category.model"));
const cache_1 = require("../../../utils/cache");
let mongoServer;
let app;
let userToken;
let adminToken;
let testUser;
let testAdmin;
let testProduct;
beforeAll(async () => {
    mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create();
    await mongoose_1.default.connect(mongoServer.getUri());
    app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(require("cookie-parser")());
    app.use("/api/orders", order_routes_1.default);
    testAdmin = await user_model_1.default.create({
        name: "Admin",
        email: "admin@test.com",
        password: "password123",
        role: "ADMIN",
    });
    testUser = await user_model_1.default.create({
        name: "Test User",
        email: "user@test.com",
        password: "password123",
        role: "USER",
    });
    adminToken = jsonwebtoken_1.default.sign({ userId: testAdmin._id.toString() }, config_1.default.jwtsecret, { expiresIn: "30d" });
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
    cache_1.memoryCache.clear();
    const collections = mongoose_1.default.connection.collections;
    for (const key in collections) {
        if (key !== "users" && key !== "categories") {
            await collections[key].deleteMany({});
        }
    }
});
describe("Order Controllers", () => {
    const createTestOrder = async (overrides = {}) => {
        return order_model_1.default.create({
            userId: testUser._id,
            orderId: `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            products: [
                {
                    productId: testProduct._id,
                    name: "Test Product",
                    image: [],
                    quantity: 1,
                    price: 500,
                    totalPrice: 500,
                },
            ],
            address: {
                customer_name: "Test Customer",
                address_line: "123 Test Street",
                district: "Dhaka",
                division: "Dhaka",
                upazila_thana: "Uttara",
                pincode: "1230",
                country: "Bangladesh",
                mobile: 1234567890,
            },
            payment_method: "manual",
            payment_type: "full",
            deliveryCharge: 80,
            order_status: "pending",
            ...overrides,
        });
    };
    describe("GET /api/orders/my-orders", () => {
        it("should return user's orders", async () => {
            await createTestOrder();
            const res = await (0, supertest_1.default)(app)
                .get("/api/orders/my-orders")
                .set("Cookie", [`token=${userToken}`]);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        });
        it("should return empty array for user with no orders", async () => {
            const res = await (0, supertest_1.default)(app)
                .get("/api/orders/my-orders")
                .set("Cookie", [`token=${userToken}`]);
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
        });
    });
    describe("GET /api/orders/:id", () => {
        it("should return single order details", async () => {
            const order = await createTestOrder();
            const res = await (0, supertest_1.default)(app)
                .get(`/api/orders/${order._id}`)
                .set("Cookie", [`token=${userToken}`]);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
        });
        it("should return 404 for non-existent order", async () => {
            const fakeId = new mongoose_1.default.Types.ObjectId().toString();
            const res = await (0, supertest_1.default)(app)
                .get(`/api/orders/${fakeId}`)
                .set("Cookie", [`token=${userToken}`]);
            expect(res.status).toBe(404);
        });
    });
    describe("PUT /api/orders/:id/status", () => {
        it("should update order status as admin", async () => {
            const order = await createTestOrder();
            const res = await (0, supertest_1.default)(app)
                .put(`/api/orders/${order._id}/status`)
                .set("Cookie", [`token=${adminToken}`])
                .send({ status: "processing" });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
        it("should return 400 for invalid status", async () => {
            const order = await createTestOrder();
            const res = await (0, supertest_1.default)(app)
                .put(`/api/orders/${order._id}/status`)
                .set("Cookie", [`token=${adminToken}`])
                .send({ status: "invalid-status" });
            expect(res.status).toBe(400);
        });
        it("should return 400 if status is missing", async () => {
            const order = await createTestOrder();
            const res = await (0, supertest_1.default)(app)
                .put(`/api/orders/${order._id}/status`)
                .set("Cookie", [`token=${adminToken}`])
                .send({});
            expect(res.status).toBe(400);
        });
    });
});
