"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cloudinary_1 = require("cloudinary");
const fs_1 = __importDefault(require("fs"));
const config_1 = __importDefault(require("../config"));
// ✅ Type-safe cloudinary uploader
const uploadClouinary = async (file) => {
    if (!file)
        throw new Error("Invalid file path");
    // Cloudinary config
    cloudinary_1.v2.config({
        cloud_name: config_1.default.cloudname,
        api_key: config_1.default.cloudapikey,
        api_secret: config_1.default.cloudapisecret,
    });
    try {
        const result = await cloudinary_1.v2.uploader.upload(file);
        if (fs_1.default.existsSync(file))
            fs_1.default.unlinkSync(file); // cleanup local file
        return result.secure_url;
    }
    catch (error) {
        if (fs_1.default.existsSync(file))
            fs_1.default.unlinkSync(file);
        console.error("❌ Cloudinary upload failed:", error);
        throw new Error("Cloudinary upload failed");
    }
};
exports.default = uploadClouinary;
