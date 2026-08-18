import express from "express";
import { getReferralSettings, updateReferralSettings } from "./referral.controllers";
import { isAuth } from "../../middlewares/isAuth";
import { isAdmin } from "../../middlewares/isAdmin";

const router = express.Router();

// GET
router.get("/get", getReferralSettings);

// UPDATE
router.put("/update", isAuth, isAdmin, updateReferralSettings);

export default router;
