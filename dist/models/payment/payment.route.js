"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("./payment.controller");
const isAuth_1 = require("../../middlewares/isAuth"); // Adjusted import path based on the provided folder structure
const router = (0, express_1.Router)();
router.post("/initiate", isAuth_1.isAuth, payment_controller_1.initiatePayment);
exports.default = router;
