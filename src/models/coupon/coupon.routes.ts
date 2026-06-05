import { Router, Request, Response, NextFunction } from "express";
import { applyCoupon, applyDropshippingCoupon, createCoupon, getCoupons, deleteCoupon, updateCoupon, getProductCoupons } from "./coupon.controller";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";

const couponRouter = Router();

// In-memory store for rate limiting (Bug 18)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const applyCouponRateLimiter = (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const key = `rate_limit_apply_coupon_${ip}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 15; // Max 15 attempts per minute

    const record = rateLimitMap.get(key as string);
    if (!record) {
        rateLimitMap.set(key as string, { count: 1, resetTime: now + windowMs });
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
couponRouter.post("/apply", isAuth, applyCouponRateLimiter, applyCoupon);
couponRouter.post("/apply-ds", isAuth, applyCouponRateLimiter, applyDropshippingCoupon);
couponRouter.get("/product/:productId", getProductCoupons);

// Admin Routes
couponRouter.post("/create", isAuth, isAdmin, createCoupon);
couponRouter.get("/", isAuth, isAdmin, getCoupons);
couponRouter.delete("/delete/:id", isAuth, isAdmin, deleteCoupon);
couponRouter.put("/update/:id", isAuth, isAdmin, updateCoupon);
couponRouter.patch("/update/:id", isAuth, isAdmin, updateCoupon);

export default couponRouter;
