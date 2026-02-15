"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const index_1 = __importDefault(require("./index"));
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(index_1.default.mongodburl, {
            maxPoolSize: 10, // Maintain up to 10 socket connections
            minPoolSize: 5, // Keep 5 connections warm
            socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5s
            heartbeatFrequencyMS: 10000, // Check server status every 10s
        });
        console.log("MongoDB connected successfully");
    }
    catch (error) {
        if (error instanceof Error) {
            console.error("MongoDB connection failed:", error.message);
        }
        else {
            console.error("MongoDB connection failed: unknown error");
        }
        process.exit(1);
    }
};
exports.default = connectDB;
