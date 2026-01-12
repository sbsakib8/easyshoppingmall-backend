"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSslPayment = void 0;
const sslcommerz_lts_1 = __importDefault(require("sslcommerz-lts"));
const sslcommerz_1 = require("../../../config/sslcommerz");
const initSslPayment = async (payload) => {
    const sslcz = new sslcommerz_lts_1.default(sslcommerz_1.sslConfig.store_id, sslcommerz_1.sslConfig.store_passwd, sslcommerz_1.sslConfig.isLive);
    return sslcz.init(payload);
};
exports.initSslPayment = initSslPayment;
