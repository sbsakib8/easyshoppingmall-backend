import { Router } from "express";
import { getAllPayments, getOrderPayments } from "./admin.payment.controller";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";

const router = Router();

router.get("/payments", isAuth, isAdmin, getAllPayments);
router.get("/payments/:orderId", isAuth, isAdmin, getOrderPayments);
// router.get("/orders", isAuth, isAdmin, getAllOrders);

export default router;
