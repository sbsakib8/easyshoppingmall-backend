"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const index_1 = __importDefault(require("./index"));
let isConnected = false;
const connectDB = async () => {
    if (isConnected)
        return;
    try {
        const db = await mongoose_1.default.connect(index_1.default.mongodburl, {
            serverSelectionTimeoutMS: 30000,
            maxPoolSize: 10,
        });
        isConnected = db.connections[0].readyState === 1;
        console.log("✅ MongoDB connected");
    }
    catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        throw error; // 🔥 important
    }
};
exports.default = connectDB;
