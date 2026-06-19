"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../setup");
const isAdmin_1 = require("../../middlewares/isAdmin");
const mockResponse = () => {
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    return res;
};
describe("isAdmin Middleware", () => {
    it("should return 401 if no req.userId is set", async () => {
        const req = {};
        const res = mockResponse();
        const next = jest.fn();
        await (0, isAdmin_1.isAdmin)(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("Unauthorized") }));
        expect(next).not.toHaveBeenCalled();
    });
    it("should return 403 for non-admin role", async () => {
        const req = {
            userId: "some-user-id",
            user: { _id: "some-user-id", role: "user", roles: ["user"] },
        };
        const res = mockResponse();
        const next = jest.fn();
        await (0, isAdmin_1.isAdmin)(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("Admins only") }));
        expect(next).not.toHaveBeenCalled();
    });
    it("should call next() if user has ADMIN role in req.user.role", async () => {
        const req = {
            userId: "some-user-id",
            user: { _id: "some-user-id", role: "ADMIN", roles: ["USER"] },
        };
        const res = mockResponse();
        const next = jest.fn();
        await (0, isAdmin_1.isAdmin)(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
    it("should call next() if user has ADMIN in req.user.roles array", async () => {
        const req = {
            userId: "some-user-id",
            user: { _id: "some-user-id", role: "USER", roles: ["USER", "ADMIN"] },
        };
        const res = mockResponse();
        const next = jest.fn();
        await (0, isAdmin_1.isAdmin)(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
    it("should be case-insensitive for role check", async () => {
        const req = {
            userId: "some-user-id",
            user: { _id: "some-user-id", role: "admin", roles: ["user"] },
        };
        const res = mockResponse();
        const next = jest.fn();
        await (0, isAdmin_1.isAdmin)(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
