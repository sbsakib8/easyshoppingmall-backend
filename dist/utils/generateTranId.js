"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTranId = void 0;
const generateTranId = () => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8); // 6 random alphanumeric characters
    return `TRN-${timestamp}-${random}`;
};
exports.generateTranId = generateTranId;
