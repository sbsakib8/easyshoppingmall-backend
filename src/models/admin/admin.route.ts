import { Router } from "express";
import { getAllOrders, getAllPayments, getOrderPayments } from "./admin.payment.controller";
// import admin from "../../middlewares/isAdmin"; // Adjusted import path based on the provided folder structure
import { isAdmin } from "../../middlewares/isAdmin";
import { isAuth } from "../../middlewares/isAuth";

const router = Router();

router.get("/payments", isAdmin, getAllPayments);
router.get("/payments/:orderId", isAdmin, getOrderPayments);
router.get("/orders", isAuth, isAdmin, getAllOrders);

export default router;
