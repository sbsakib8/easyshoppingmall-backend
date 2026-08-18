"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptBody = void 0;
const crypto_js_1 = __importDefault(require("crypto-js"));
const ENCRYPTION_KEY = process.env.FRONTEND_ENCRYPTION_KEY || "easyshop-frontend-secret-key-2024";
function decryptValue(cipherText) {
    try {
        const bytes = crypto_js_1.default.AES.decrypt(cipherText, ENCRYPTION_KEY);
        const decrypted = bytes.toString(crypto_js_1.default.enc.Utf8);
        return decrypted || null;
    }
    catch {
        return null;
    }
}
function isEncryptedString(value) {
    if (typeof value !== "string")
        return false;
    return value.startsWith("U2FsdGVkX1");
}
function decryptObject(obj) {
    if (!obj || typeof obj !== "object")
        return obj;
    const result = Array.isArray(obj) ? [] : {};
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === "string" && isEncryptedString(val)) {
            const decrypted = decryptValue(val);
            if (decrypted !== null) {
                try {
                    result[key] = JSON.parse(decrypted);
                }
                catch {
                    result[key] = decrypted;
                }
            }
            else {
                result[key] = val;
            }
        }
        else if (typeof val === "object" && val !== null) {
            result[key] = decryptObject(val);
        }
        else {
            result[key] = val;
        }
    }
    return result;
}
const decryptBody = (req, _res, next) => {
    try {
        if (req.body && typeof req.body === "object") {
            req.body = decryptObject(req.body);
        }
        next();
    }
    catch {
        next();
    }
};
exports.decryptBody = decryptBody;
