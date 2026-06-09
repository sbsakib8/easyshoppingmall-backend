"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const user_model_1 = __importDefault(require("../models/user/user.model"));
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return next();
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwtsecret);
        if (!decoded?.userId) {
            return next();
        }
        const user = await user_model_1.default.findById(decoded.userId).maxTimeMS(5000); // 5s timeout
        if (!user) {
            return next();
        }
        req.userId = decoded.userId;
        req.user = {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role?.toLowerCase() || "user",
            roles: user.roles || [user.role],
            mobile: user.mobile || undefined,
            balance: user.balance || 0,
        };
        next();
    }
    catch (error) {
        // Proceed without adding user details if token is invalid or expired
        next();
    }
};
exports.optionalAuth = optionalAuth;
