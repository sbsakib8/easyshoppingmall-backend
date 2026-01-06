"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const user_model_1 = __importDefault(require("../models/user/user.model")); // Import UserModel
const isAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.token;
        if (!token) {
            res.status(401).json({ message: "Unauthorized: No token provided" });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwtsecret);
        if (!decoded?.userId) {
            res.status(401).json({ message: "Unauthorized: Invalid token" });
            return;
        }
        const user = await user_model_1.default.findById(decoded.userId); // Find user by ID
        if (!user) {
            res.status(401).json({ message: "Unauthorized: User not found" });
            return;
        }
        req.userId = decoded.userId;
        req.user = {
            _id: user._id.toString(), // Convert ObjectId to string
            name: user.name,
            email: user.email,
            role: user.role === "ADMIN" ? "admin" : "user", // Map role
            mobile: user.mobile || undefined, // Populate mobile
        };
        next();
    }
    catch (error) {
        res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
};
exports.isAuth = isAuth;
