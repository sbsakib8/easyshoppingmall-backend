// routes/payment.routes.ts
import express from "express";
import {
  initPayment,
  paymentSuccess,
  paymentFail,
  paymentCancel,
  paymentIpn,
} from "./sslCommerz.controller";
import { isAuth } from "../../middlewares/isAuth";

const router = express.Router();

router.post("/init", isAuth, initPayment);
router.post("/success", paymentSuccess);
router.post("/fail", paymentFail);
router.post("/cancel", paymentCancel);
router.post("/ipn", paymentIpn);

export default router;
