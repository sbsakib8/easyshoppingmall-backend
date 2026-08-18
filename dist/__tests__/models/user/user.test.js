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
const user_routes_1 = __importDefault(require("../../../models/user/user.routes"));
const user_model_1 = __importDefault(require("../../../models/user/user.model"));
let mongoServer;
let app;
beforeAll(async () => {
    mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create();
    await mongoose_1.default.connect(mongoServer.getUri());
    app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(require("cookie-parser")());
    app.use("/api/users", user_routes_1.default);
});
afterAll(async () => {
    await mongoose_1.default.disconnect();
    await mongoServer.stop();
});
beforeEach(async () => {
    const collections = mongoose_1.default.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});
describe("User Controllers", () => {
    describe("POST /api/users/signup", () => {
        it("should create a new user", async () => {
            const res = await (0, supertest_1.default)(app)
                .post("/api/users/signup")
                .send({
                name: "Test User",
                email: "test@example.com",
                password: "password123",
            });
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.email).toBe("test@example.com");
        });
        it("should return 400 for duplicate email", async () => {
            await user_model_1.default.create({
                name: "Existing User",
                email: "test@example.com",
                password: "password123",
            });
            const res = await (0, supertest_1.default)(app)
                .post("/api/users/signup")
                .send({
                name: "Test User",
                email: "test@example.com",
                password: "password123",
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toContain("already exists");
        });
    });
    describe("POST /api/users/signin", () => {
        it("should sign in with correct credentials", async () => {
            await (0, supertest_1.default)(app)
                .post("/api/users/signup")
                .send({
                name: "Test User",
                email: "test@example.com",
                password: "password123",
            });
            const res = await (0, supertest_1.default)(app)
                .post("/api/users/signin")
                .send({
                email: "test@example.com",
                password: "password123",
            });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user).toBeDefined();
        });
        it("should return 401 with wrong password", async () => {
            await (0, supertest_1.default)(app)
                .post("/api/users/signup")
                .send({
                name: "Test User",
                email: "test@example.com",
                password: "password123",
            });
            const res = await (0, supertest_1.default)(app)
                .post("/api/users/signin")
                .send({
                email: "test@example.com",
                password: "wrongpassword",
            });
            expect(res.status).toBe(401);
            expect(res.body.message).toContain("incorrect password");
        });
        it("should return 401 for non-existent user", async () => {
            const res = await (0, supertest_1.default)(app)
                .post("/api/users/signin")
                .send({
                email: "nonexistent@example.com",
                password: "password123",
            });
            expect(res.status).toBe(401);
            expect(res.body.message).toContain("does not exist");
        });
    });
    describe("GET /api/users/userprofile", () => {
        it("should return user profile for authenticated user", async () => {
            const signupRes = await (0, supertest_1.default)(app)
                .post("/api/users/signup")
                .send({
                name: "Test User",
                email: "test@example.com",
                password: "password123",
            });
            const setCookie = signupRes.headers["set-cookie"];
            const cookieArray = Array.isArray(setCookie) ? setCookie : [setCookie].filter(Boolean);
            const token = cookieArray
                ?.map((c) => c.split(";")[0])
                ?.find((c) => c.startsWith("token="))
                ?.split("=")[1];
            const res = await (0, supertest_1.default)(app)
                .get("/api/users/userprofile")
                .set("Cookie", [`token=${token}`]);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user).toBeDefined();
        });
        it("should return 401 without token", async () => {
            const res = await (0, supertest_1.default)(app)
                .get("/api/users/userprofile");
            expect(res.status).toBe(401);
        });
    });
    describe("GET /api/users/signout", () => {
        it("should sign out user and clear cookie", async () => {
            const res = await (0, supertest_1.default)(app)
                .get("/api/users/signout");
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
