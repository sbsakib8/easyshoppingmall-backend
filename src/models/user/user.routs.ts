import express from "express";
import { getUserProfile, resetpassword, sendotp, signIn, signOut, signUp, verifyotp } from "./user.controllers";

const router = express.Router();

router.post("/signup", signUp);
router.post("/signin", signIn);
router.get("/signout", signOut);
router.get("/:userid", getUserProfile);

// reset password
router.post("/send-otp", sendotp);
router.post("/verify-otp", verifyotp);
router.post("/reset-password", resetpassword);

export default router;
