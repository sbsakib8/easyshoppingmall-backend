"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = void 0;
const user_model_1 = __importDefault(require("../models/user/user.model"));
const isAdmin = async (req, res, next) => {
    try {
        if (!req.userId) {
            res.status(401).json({
                message: "Unauthorized: No userId found",
                error: true,
                success: false,
            });
            return;
        }
        const user = await user_model_1.default.findById(req.userId).select("role");
        if (!user) {
            res.status(404).json({
                message: "User not found",
                error: true,
                success: false,
            });
            return;
        }
        if (user.role !== "ADMIN") {
            res.status(403).json({
                message: "Permission denied: Admins only",
                error: true,
                success: false,
            });
            return;
        }
        next();
    }
    catch (err) {
        console.error("Admin middleware error:", err);
        res.status(500).json({
            message: "Internal server error in admin middleware",
            error: true,
            success: false,
        });
    }
};
exports.isAdmin = isAdmin;
