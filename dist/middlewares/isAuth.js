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
        const user = await user_model_1.default.findById(decoded.userId).maxTimeMS(5000); // 5s timeout
        if (!user) {
            res.status(401).json({ message: "Unauthorized: User not found" });
            return;
        }
        req.userId = decoded.userId;
        req.user = {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role === "ADMIN" ? "admin" : "user",
            mobile: user.mobile || undefined,
        };
        next();
    }
    catch (error) {
        if (error.name === "TokenExpiredError") {
            res.status(401).json({ message: "Unauthorized: Token expired" });
        }
        else if (error.name === "JsonWebTokenError") {
            res.status(401).json({ message: "Unauthorized: Invalid token" });
        }
        else if (error.name === "MongooseError" || error.name === "MongoTimeoutError") {
            console.error("Database error in isAuth:", error.message);
            res.status(500).json({ message: "Internal Server Error: Database timeout" });
        }
        else {
            console.error("Auth error:", error.message);
            res.status(401).json({ message: "Unauthorized: Authentication failed" });
        }
    }
};
exports.isAuth = isAuth;
