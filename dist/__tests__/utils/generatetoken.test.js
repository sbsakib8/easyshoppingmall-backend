"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("../setup");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const generatetoken_1 = __importDefault(require("../../utils/generatetoken"));
const config_1 = __importDefault(require("../../config"));
describe("generateToken", () => {
    const testUserId = "507f1f77bcf86cd799439011";
    it("should return a valid JWT string", () => {
        const token = (0, generatetoken_1.default)(testUserId);
        expect(typeof token).toBe("string");
        expect(token.split(".")).toHaveLength(3);
    });
    it("should decode to correct userId", () => {
        const token = (0, generatetoken_1.default)(testUserId);
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwtsecret);
        expect(decoded.userId).toBe(testUserId);
    });
    it("should have 30 day expiry", () => {
        const token = (0, generatetoken_1.default)(testUserId);
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwtsecret);
        const now = Math.floor(Date.now() / 1000);
        const thirtyDays = 30 * 24 * 60 * 60;
        expect(decoded.exp - decoded.iat).toBe(thirtyDays);
        expect(decoded.exp).toBeGreaterThan(now);
    });
    it("should produce different tokens for different IDs", () => {
        const token1 = (0, generatetoken_1.default)("507f1f77bcf86cd799439011");
        const token2 = (0, generatetoken_1.default)("507f1f77bcf86cd799439012");
        expect(token1).not.toBe(token2);
    });
    it("should be verifiable with the correct secret", () => {
        const token = (0, generatetoken_1.default)(testUserId);
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwtsecret);
        expect(decoded.userId).toBe(testUserId);
    });
    it("should fail verification with wrong secret", () => {
        const token = (0, generatetoken_1.default)(testUserId);
        expect(() => jsonwebtoken_1.default.verify(token, "wrong-secret")).toThrow();
    });
});
