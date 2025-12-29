"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const moment_1 = __importDefault(require("moment"));
require("moment/locale/bn");
const BlogSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    category: { type: String, required: true },
    status: { type: String, enum: ["Draft", "Published"], default: "Draft" },
    image: { type: String },
    excerpt: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    createdDateBn: { type: String },
    createdTimeBn: { type: String },
}, { timestamps: true });
BlogSchema.pre("save", function (next) {
    const now = (0, moment_1.default)().locale("bn");
    this.createdDateBn = now.format("DD MMMM, YYYY");
    this.createdTimeBn = now.format("hh:mm A");
    next();
});
BlogSchema.pre("findOneAndUpdate", function (next) {
    const now = (0, moment_1.default)().locale("bn");
    this.set({
        createdDateBn: now.format("DD MMMM, YYYY"),
        createdTimeBn: now.format("hh:mm A"),
    });
    next();
});
exports.default = mongoose_1.default.model("Blog", BlogSchema);
