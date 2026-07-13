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
const category_routes_1 = __importDefault(require("../../../models/category/category.routes"));
const category_model_1 = __importDefault(require("../../../models/category/category.model"));
const user_model_1 = __importDefault(require("../../../models/user/user.model"));
const cache_1 = require("../../../utils/cache");
let mongoServer;
let app;
let adminToken;
let testAdmin;
beforeAll(async () => {
    mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create();
    await mongoose_1.default.connect(mongoServer.getUri());
    app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(require("cookie-parser")());
    app.use("/api/categories", category_routes_1.default);
    testAdmin = await user_model_1.default.create({
        name: "Admin",
        email: "admin@test.com",
        password: "password123",
        role: "ADMIN",
    });
    adminToken = jsonwebtoken_1.default.sign({ userId: testAdmin._id.toString() }, config_1.default.jwtsecret, { expiresIn: "30d" });
});
afterAll(async () => {
    await mongoose_1.default.disconnect();
    await mongoServer.stop();
});
beforeEach(async () => {
    await cache_1.cache.delByPrefix("");
    const collections = mongoose_1.default.connection.collections;
    for (const key in collections) {
        if (key !== "users") {
            await collections[key].deleteMany({});
        }
    }
});
describe("Category Controllers", () => {
    describe("GET /api/categories/", () => {
        it("should return all categories", async () => {
            await category_model_1.default.create({ name: "Electronics", image: "http://example.com/cat.jpg" });
            await category_model_1.default.create({ name: "Clothing", image: "http://example.com/cat2.jpg" });
            const res = await (0, supertest_1.default)(app).get("/api/categories/");
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBe(2);
        });
        it("should return empty array when no categories exist", async () => {
            const res = await (0, supertest_1.default)(app).get("/api/categories/");
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toEqual([]);
        });
    });
    describe("GET /api/categories/:id", () => {
        it("should return a single category by id", async () => {
            const category = await category_model_1.default.create({
                name: "Electronics",
                image: "http://example.com/cat.jpg",
            });
            const res = await (0, supertest_1.default)(app).get(`/api/categories/${category._id}`);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe("Electronics");
        });
        it("should return 404 for non-existent category", async () => {
            const fakeId = new mongoose_1.default.Types.ObjectId().toString();
            const res = await (0, supertest_1.default)(app).get(`/api/categories/${fakeId}`);
            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });
    describe("PUT /api/categories/:id", () => {
        it("should update a category", async () => {
            const category = await category_model_1.default.create({
                name: "Electronics",
                image: "http://example.com/cat.jpg",
            });
            const res = await (0, supertest_1.default)(app)
                .put(`/api/categories/${category._id}`)
                .set("Cookie", [`token=${adminToken}`])
                .send({ name: "Updated Electronics" });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe("Updated Electronics");
        });
        it("should return 404 for non-existent category", async () => {
            const fakeId = new mongoose_1.default.Types.ObjectId().toString();
            const res = await (0, supertest_1.default)(app)
                .put(`/api/categories/${fakeId}`)
                .set("Cookie", [`token=${adminToken}`])
                .send({ name: "Updated" });
            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });
    describe("DELETE /api/categories/:id", () => {
        it("should delete a category", async () => {
            const category = await category_model_1.default.create({
                name: "Electronics",
                image: "http://example.com/cat.jpg",
            });
            const res = await (0, supertest_1.default)(app)
                .delete(`/api/categories/${category._id}`)
                .set("Cookie", [`token=${adminToken}`]);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            const deleted = await category_model_1.default.findById(category._id);
            expect(deleted).toBeNull();
        });
        it("should return 404 for non-existent category", async () => {
            const fakeId = new mongoose_1.default.Types.ObjectId().toString();
            const res = await (0, supertest_1.default)(app)
                .delete(`/api/categories/${fakeId}`)
                .set("Cookie", [`token=${adminToken}`]);
            expect(res.status).toBe(404);
        });
    });
});
