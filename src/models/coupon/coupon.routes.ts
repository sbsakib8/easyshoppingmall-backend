import { Router } from "express";
import { applyCoupon, createCoupon, getCoupons, deleteCoupon, updateCoupon, getProductCoupons } from "./coupon.controller";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";

const couponRouter = Router();

// Public / User Routes
couponRouter.post("/apply", applyCoupon);
couponRouter.get("/product/:productId", getProductCoupons);

// Admin Routes
couponRouter.post("/create", isAuth, isAdmin, createCoupon);
couponRouter.get("/", isAuth, isAdmin, getCoupons);
couponRouter.delete("/delete/:id", isAuth, isAdmin, deleteCoupon);
couponRouter.put("/update/:id", isAuth, isAdmin, updateCoupon);
couponRouter.patch("/update/:id", isAuth, isAdmin, updateCoupon);

export default couponRouter;
