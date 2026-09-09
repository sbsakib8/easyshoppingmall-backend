"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const processdata = {
    jwtsecret: process.env.JWT_SECRET || "sjdtkfyg7t87tvyg97yuhu98",
    mongodburl: (process.env.MONGODB_URL || "").trim(),
    pass: (process.env.APP_PASS || "").replace(/\s+/g, "").trim(),
    email: (process.env.EMAIL || "").trim(),
    receiveremail: (process.env.RECEIVER_EMAIL || "").trim(),
    cloudname: (process.env.CLOUD_NAME || "").trim(),
    cloudapikey: (process.env.CLOUD_API_KEY || "").trim(),
    cloudapisecret: (process.env.CLOUD_API_SECRET || "").trim(),
    sslcommerzstoreid: (process.env.SSLC_STORE_ID || "").trim(),
    sslcommerzstorepassword: (process.env.SSLC_STORE_PASSWORD || "").trim(),
    upstashRedisUrl: process.env.UPSTASH_REDIS_REST_URL || "",
    upstashRedisToken: process.env.UPSTASH_REDIS_REST_TOKEN || "",
};
exports.default = processdata;
