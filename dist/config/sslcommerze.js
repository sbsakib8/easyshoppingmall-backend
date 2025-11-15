"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sslConfig = void 0;
exports.sslConfig = {
    store_id: process.env.SSLC_STORE_ID,
    store_passwd: process.env.SSLC_STORE_PASSWORD,
    is_live: false, // ⚠️ set to true in production
};
