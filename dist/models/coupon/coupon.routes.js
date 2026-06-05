"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const coupon_controller_1 = require("./coupon.controller");
const isAuth_1 = require("../../middlewares/isAuth");
const isAdmin_1 = require("../../middlewares/isAdmin");
const couponRouter = (0, express_1.Router)();
// In-memory store for rate limiting (Bug 18)
const rateLimitMap = new Map();
const applyCouponRateLimiter = (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const key = `rate_limit_apply_coupon_${ip}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 15; // Max 15 attempts per minute
    const record = rateLimitMap.get(key);
    if (!record) {
        rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
        return next();
    }
    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
        return next();
    }
    record.count += 1;
    if (record.count > maxRequests) {
        return res.status(429).json({
            success: false,
            message: "অতিরিক্ত কুপন ট্রাই করা হয়েছে। অনুগ্রহ করে ১ মিনিট পর আবার চেষ্টা করুন। / Too many coupon application attempts. Please try again after 1 minute."
        });
    }
    next();
};
// Public / User Routes
couponRouter.post("/apply", isAuth_1.isAuth, applyCouponRateLimiter, coupon_controller_1.applyCoupon);
couponRouter.post("/apply-ds", isAuth_1.isAuth, applyCouponRateLimiter, coupon_controller_1.applyDropshippingCoupon);
couponRouter.get("/product/:productId", coupon_controller_1.getProductCoupons);
// Admin Routes
couponRouter.post("/create", isAuth_1.isAuth, isAdmin_1.isAdmin, coupon_controller_1.createCoupon);
couponRouter.get("/", isAuth_1.isAuth, isAdmin_1.isAdmin, coupon_controller_1.getCoupons);
couponRouter.delete("/delete/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, coupon_controller_1.deleteCoupon);
couponRouter.put("/update/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, coupon_controller_1.updateCoupon);
couponRouter.patch("/update/:id", isAuth_1.isAuth, isAdmin_1.isAdmin, coupon_controller_1.updateCoupon);
exports.default = couponRouter;
