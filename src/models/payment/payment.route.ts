import { Router } from "express";
import { isAuth } from "../../middlewares/isAuth";
import {
  initSslPayment,
  paymentCancel,
  paymentFail,
  paymentIpn,
  paymentSuccess,
} from "./payment.controller";
const router = Router();

router.post("/initiate", isAuth, initSslPayment);
router.post("/success", paymentSuccess);
router.post("/fail", paymentFail);
router.post("/cancel", paymentCancel);
router.post("/ipn", paymentIpn);

export default router;
