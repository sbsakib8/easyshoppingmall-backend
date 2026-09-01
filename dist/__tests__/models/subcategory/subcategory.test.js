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
const subcategory_routes_1 = __importDefault(require("../../../models/subcategory/subcategory.routes"));
const category_model_1 = __importDefault(require("../../../models/category/category.model"));
const subcategory_model_1 = __importDefault(require("../../../models/subcategory/subcategory.model"));
const user_model_1 = __importDefault(require("../../../models/user/user.model"));
const cache_1 = require("../../../utils/cache");
let mongoServer;
let app;
let adminToken;
let testAdmin;
let testCategory;
beforeAll(async () => {
    mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create();
    await mongoose_1.default.connect(mongoServer.getUri());
    app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(require("cookie-parser")());
    app.use("/api/subcategories", subcategory_routes_1.default);
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
});
afterAll(async () => {
    await mongoose_1.default.disconnect();
    await mongoServer.stop();
});
beforeEach(async () => {
    await cache_1.cache.delByPrefix("");
    const collections = mongoose_1.default.connection.collections;
    for (const key in collections) {
        if (key !== "users" && key !== "categories") {
            await collections[key].deleteMany({});
        }
    }
});
describe("SubCategory Controllers", () => {
    describe("POST /api/subcategories/create", () => {
        it("should create a subcategory with image", async () => {
            const res = await (0, supertest_1.default)(app)
                .post("/api/subcategories/create")
                .set("Cookie", [`token=${adminToken}`])
                .field("name", "Phones")
                .field("category", testCategory._id.toString())
                .attach("image", Buffer.from("fake-image-data"), "test.jpg");
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe("Phones");
            expect(res.body.data.image).toBeDefined();
        });
        it("should return 400 for invalid category ID", async () => {
            const fakeId = new mongoose_1.default.Types.ObjectId().toString();
            const res = await (0, supertest_1.default)(app)
                .post("/api/subcategories/create")
                .set("Cookie", [`token=${adminToken}`])
                .field("name", "Phones")
                .field("category", fakeId)
                .attach("image", Buffer.from("fake-image-data"), "test.jpg");
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
        it("should return 400 if subcategory name already exists", async () => {
            await subcategory_model_1.default.create({
                name: "Phones",
                image: "http://example.com/sub.jpg",
                category: testCategory._id,
            });
            const res = await (0, supertest_1.default)(app)
                .post("/api/subcategories/create")
                .set("Cookie", [`token=${adminToken}`])
                .field("name", "Phones")
                .field("category", testCategory._id.toString())
                .attach("image", Buffer.from("fake-image-data"), "test.jpg");
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
        it("should return 400 if no image is provided", async () => {
            const res = await (0, supertest_1.default)(app)
                .post("/api/subcategories/create")
                .set("Cookie", [`token=${adminToken}`])
                .field("name", "Phones")
                .field("category", testCategory._id.toString());
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });
    describe("GET /api/subcategories/", () => {
        it("should return all subcategories", async () => {
            await subcategory_model_1.default.create({
                name: "Phones",
                image: "http://example.com/sub.jpg",
                category: testCategory._id,
            });
            await subcategory_model_1.default.create({
                name: "Laptops",
                image: "http://example.com/sub2.jpg",
                category: testCategory._id,
            });
            const res = await (0, supertest_1.default)(app).get("/api/subcategories/");
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBe(2);
        });
        it("should return empty array when no subcategories exist", async () => {
            const res = await (0, supertest_1.default)(app).get("/api/subcategories/");
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
    describe("GET /api/subcategories/:id", () => {
        it("should return a single subcategory by id", async () => {
            const subCategory = await subcategory_model_1.default.create({
                name: "Phones",
                image: "http://example.com/sub.jpg",
                category: testCategory._id,
            });
            const res = await (0, supertest_1.default)(app).get(`/api/subcategories/${subCategory._id}`);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe("Phones");
        });
        it("should return 404 for non-existent subcategory", async () => {
            const fakeId = new mongoose_1.default.Types.ObjectId().toString();
            const res = await (0, supertest_1.default)(app).get(`/api/subcategories/${fakeId}`);
            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });
    describe("PUT /api/subcategories/:id", () => {
        it("should update a subcategory", async () => {
            const subCategory = await subcategory_model_1.default.create({
                name: "Phones",
                image: "http://example.com/sub.jpg",
                category: testCategory._id,
            });
            const res = await (0, supertest_1.default)(app)
                .put(`/api/subcategories/${subCategory._id}`)
                .set("Cookie", [`token=${adminToken}`])
                .send({ name: "Updated Phones" });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe("Updated Phones");
        });
        it("should return 404 for non-existent subcategory", async () => {
            const fakeId = new mongoose_1.default.Types.ObjectId().toString();
            const res = await (0, supertest_1.default)(app)
                .put(`/api/subcategories/${fakeId}`)
                .set("Cookie", [`token=${adminToken}`])
                .send({ name: "Updated" });
            expect(res.status).toBe(404);
        });
    });
    describe("PATCH /api/subcategories/:id/toggle-active", () => {
        it("should toggle subcategory isActive from true to false", async () => {
            const subCategory = await subcategory_model_1.default.create({
                name: "Phones",
                image: "http://example.com/sub.jpg",
                category: testCategory._id,
                isActive: true,
            });
            const res = await (0, supertest_1.default)(app)
                .patch(`/api/subcategories/${subCategory._id}/toggle-active`)
                .set("Cookie", [`token=${adminToken}`]);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.isActive).toBe(false);
            expect(res.body.message).toContain("deactivated");
        });
        it("should toggle subcategory isActive from false to true", async () => {
            const subCategory = await subcategory_model_1.default.create({
                name: "Phones",
                image: "http://example.com/sub.jpg",
                category: testCategory._id,
                isActive: false,
            });
            const res = await (0, supertest_1.default)(app)
                .patch(`/api/subcategories/${subCategory._id}/toggle-active`)
                .set("Cookie", [`token=${adminToken}`]);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.isActive).toBe(true);
            expect(res.body.message).toContain("activated");
        });
        it("should return 404 for non-existent subcategory", async () => {
            const fakeId = new mongoose_1.default.Types.ObjectId().toString();
            const res = await (0, supertest_1.default)(app)
                .patch(`/api/subcategories/${fakeId}/toggle-active`)
                .set("Cookie", [`token=${adminToken}`]);
            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
        it("should return 401 without auth token", async () => {
            const subCategory = await subcategory_model_1.default.create({
                name: "Phones",
                image: "http://example.com/sub.jpg",
                category: testCategory._id,
            });
            const res = await (0, supertest_1.default)(app)
                .patch(`/api/subcategories/${subCategory._id}/toggle-active`);
            expect(res.status).toBe(401);
        });
    });
    describe("DELETE /api/subcategories/:id", () => {
        it("should delete a subcategory", async () => {
            const subCategory = await subcategory_model_1.default.create({
                name: "Phones",
                image: "http://example.com/sub.jpg",
                category: testCategory._id,
            });
            const res = await (0, supertest_1.default)(app)
                .delete(`/api/subcategories/${subCategory._id}`)
                .set("Cookie", [`token=${adminToken}`]);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            const deleted = await subcategory_model_1.default.findById(subCategory._id);
            expect(deleted).toBeNull();
        });
        it("should return 404 for non-existent subcategory", async () => {
            const fakeId = new mongoose_1.default.Types.ObjectId().toString();
            const res = await (0, supertest_1.default)(app)
                .delete(`/api/subcategories/${fakeId}`)
                .set("Cookie", [`token=${adminToken}`]);
            expect(res.status).toBe(404);
        });
    });
});
