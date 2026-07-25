import express from "express";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";
import {
  adjustBalance,
  getBalanceHistory,
  getAllTransactions,
} from "./balanceTransaction.controllers";

const router = express.Router();

router.post("/adjust", isAuth, isAdmin, adjustBalance);
router.get("/history/:userId", isAuth, isAdmin, getBalanceHistory);
router.get("/all", isAuth, isAdmin, getAllTransactions);

export default router;
