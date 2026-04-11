"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const index_1 = __importDefault(require("./index"));
const connectDB = async () => {
    if (mongoose_1.default.connection.readyState >= 1) {
        return;
    }
    try {
        await mongoose_1.default.connect(index_1.default.mongodburl, {
            connectTimeoutMS: 10000, // 10s
            socketTimeoutMS: 45000, // 45s
            maxPoolSize: 10,
        });
        console.log("MongoDB connected successfully");
    }
    catch (error) {
        console.error("MongoDB connection failed:", error.message);
    }
};
exports.default = connectDB;
