"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("../setup");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../../config"));
const isAuth_1 = require("../../middlewares/isAuth");
const user_model_1 = __importDefault(require("../../models/user/user.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
let mongoServer;
beforeAll(async () => {
    mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create();
    await mongoose_1.default.connect(mongoServer.getUri());
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
const mockResponse = () => {
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    return res;
};
describe("isAuth Middleware", () => {
    it("should return 401 if no token is provided", async () => {
        const req = { cookies: {} };
        const res = mockResponse();
        const next = jest.fn();
        await (0, isAuth_1.isAuth)(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("Unauthorized") }));
        expect(next).not.toHaveBeenCalled();
    });
    it("should return 401 for invalid token", async () => {
        const req = { cookies: { token: "invalid-token-string" } };
        const res = mockResponse();
        const next = jest.fn();
        await (0, isAuth_1.isAuth)(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
    it("should return 401 for expired token", async () => {
        const token = jsonwebtoken_1.default.sign({ userId: "507f1f77bcf86cd799439011" }, config_1.default.jwtsecret, {
            expiresIn: "-1s",
        });
        const req = { cookies: { token } };
        const res = mockResponse();
        const next = jest.fn();
        await (0, isAuth_1.isAuth)(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("expired") }));
        expect(next).not.toHaveBeenCalled();
    });
    it("should return 401 if user not found in database", async () => {
        const fakeUserId = new mongoose_1.default.Types.ObjectId().toString();
        const token = jsonwebtoken_1.default.sign({ userId: fakeUserId }, config_1.default.jwtsecret, {
            expiresIn: "30d",
        });
        const req = { cookies: { token } };
        const res = mockResponse();
        const next = jest.fn();
        await (0, isAuth_1.isAuth)(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("User not found") }));
        expect(next).not.toHaveBeenCalled();
    });
    it("should set req.userId and req.user and call next() for valid token with existing user", async () => {
        const user = await user_model_1.default.create({
            name: "Test User",
            email: "test@example.com",
            password: "password123",
            role: "USER",
        });
        const token = jsonwebtoken_1.default.sign({ userId: user._id.toString() }, config_1.default.jwtsecret, {
            expiresIn: "30d",
        });
        const req = { cookies: { token } };
        const res = mockResponse();
        const next = jest.fn();
        await (0, isAuth_1.isAuth)(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.userId).toBe(user._id.toString());
        expect(req.user).toBeDefined();
        expect(req.user?.name).toBe("Test User");
        expect(req.user?.email).toBe("test@example.com");
    });
});
