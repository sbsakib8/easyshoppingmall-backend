"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const coupon_controller_1 = require("./coupon.controller");
const isAuth_1 = require("../../middlewares/isAuth");
const isAdmin_1 = require("../../middlewares/isAdmin");
const couponRouter = (0, express_1.Router)();
// Public / User Routes
couponRouter.post("/apply", coupon_controller_1.applyCoupon);
// Admin Routes
couponRouter.post("/create", isAuth_1.isAuth, isAdmin_1.isAdmin, coupon_controller_1.createCoupon);
couponRouter.get("/", isAuth_1.isAuth, isAdmin_1.isAdmin, coupon_controller_1.getCoupons);
couponRouter.delete("/delete/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, coupon_controller_1.deleteCoupon);
couponRouter.put("/update/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, coupon_controller_1.updateCoupon);
exports.default = couponRouter;
