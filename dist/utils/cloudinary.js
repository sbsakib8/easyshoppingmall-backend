"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// cloudinaryUpload.ts
const cloudinary_1 = require("cloudinary");
const config_1 = __importDefault(require("../config"));
const uploadCloudinary = async (fileBuffer) => {
    if (!fileBuffer)
        throw new Error("Invalid file buffer");
    cloudinary_1.v2.config({
        cloud_name: config_1.default.cloudname,
        api_key: config_1.default.cloudapikey,
        api_secret: config_1.default.cloudapisecret,
    });
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary_1.v2.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
            if (error) {
                console.error("❌ Cloudinary upload failed:", error);
                return reject(error);
            }
            if (!result || !result.secure_url) {
                return reject(new Error("Cloudinary upload returned no URL"));
            }
            resolve(result.secure_url);
        });
        uploadStream.end(fileBuffer);
    });
};
exports.default = uploadCloudinary;
