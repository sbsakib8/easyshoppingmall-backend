"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const processdata = {
    jwtsecret: process.env.JWT_SECRET || " ",
    mongodburl: process.env.MONGODB_URL || " "
};
exports.default = processdata;
