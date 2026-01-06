"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_payment_controller_1 = require("./admin.payment.controller");
// import admin from "../../middlewares/isAdmin"; // Adjusted import path based on the provided folder structure
const isAdmin_1 = require("../../middlewares/isAdmin");
const router = (0, express_1.Router)();
router.get("/payments", isAdmin_1.isAdmin, admin_payment_controller_1.getAllPayments);
router.get("/payments/:orderId", isAdmin_1.isAdmin, admin_payment_controller_1.getOrderPayments);
// router.get("/orders", isAuth, isAdmin, getAllOrders);
exports.default = router;
