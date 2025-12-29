"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const isAuth_1 = require("../../middlewares/isAuth");
const sslCommerz_controller_1 = require("./sslCommerz.controller");
const router = express_1.default.Router();
router.post("/init", isAuth_1.isAuth, sslCommerz_controller_1.initSslPayment);
router.post("/success", sslCommerz_controller_1.paymentSuccess);
router.post("/fail", sslCommerz_controller_1.paymentFail);
router.post("/cancel", sslCommerz_controller_1.paymentCancel);
router.post("/ipn", sslCommerz_controller_1.paymentIpn);
exports.default = router;
