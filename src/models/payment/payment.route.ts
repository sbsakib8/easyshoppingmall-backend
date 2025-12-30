import express from "express";
import { isAuth } from "../../middlewares/isAuth";
import {
  initSslPayment,
  paymentCancel,
  paymentFail,
  paymentIpn,
  paymentSuccess,
} from "./sslCommerz.controller";

const router = express.Router();

router.post("/init", isAuth, initSslPayment);
router.post("/success", paymentSuccess);
router.post("/fail", paymentFail);
router.post("/cancel", paymentCancel);
router.post("/ipn", paymentIpn);

export default router;
