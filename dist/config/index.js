"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const processdata = {
    jwtsecret: process.env.JWT_SECRET || "sjdtkfyg7t87tvyg97yuhu98",
    mongodburl: process.env.MONGODB_URL || " ",
    pass: process.env.APP_PASS || " ",
    email: process.env.EMAIL || " ",
    cloudname: process.env.CLOUD_NAME || " ",
    cloudapikey: process.env.CLOUD_API_KEY || " ",
    cloudapisecret: process.env.CLOUD_API_SECRET || " ",
};
exports.default = processdata;
