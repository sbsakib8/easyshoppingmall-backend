import { Router } from "express";
import { getAllPayments, getOrderPayments } from "./admin.payment.controller";
import { isAuth } from "../../middlewares/isAuth";
import { isDashboardAccess } from "../../middlewares/isDashboardAccess";

const router = Router();

router.get("/payments", isAuth, isDashboardAccess("orders"), getAllPayments);
router.get("/payments/:orderId", isAuth, isDashboardAccess("orders"), getOrderPayments);
// router.get("/orders", isAuth, isAdmin, getAllOrders);

export default router;
