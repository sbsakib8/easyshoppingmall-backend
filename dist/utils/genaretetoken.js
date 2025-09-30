"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const generateToken = async (userId) => {
    const token = await jsonwebtoken_1.default.sign({ id: userId }, config_1.default.jwtsecret, {
        expiresIn: "30d",
    });
    return token;
};
exports.default = generateToken;
