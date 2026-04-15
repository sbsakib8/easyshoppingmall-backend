"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const index_1 = __importDefault(require("./index"));
const connectDB = async () => {
    // Use mongoose's built-in connection states
    // 1 = connected, 2 = connecting
    if (mongoose_1.default.connection.readyState === 1 || mongoose_1.default.connection.readyState === 2) {
        return;
    }
    try {
        await mongoose_1.default.connect(index_1.default.mongodburl, {
            maxPoolSize: 10,
        });
        console.log("✅ MongoDB connected");
    }
    catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        throw error;
    }
};
exports.default = connectDB;
