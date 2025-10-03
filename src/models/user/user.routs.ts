import express from "express";
import { getUserProfile, googleAuth, resetpassword, sendotp, signIn, signOut, signUp, verifyotp } from "./user.controllers";
import { isAuth } from "../../middlewares/isAuth";

const router = express.Router();

router.post("/signup", signUp);
router.post("/signin", signIn);
router.get("/signout", signOut);

// reset password
router.post("/send-otp", sendotp);
router.post("/verify-otp", verifyotp);
router.post("/reset-password", resetpassword);

// google auth
 router.post("/google-auth", googleAuth);

//  user routes
router.get("/userprofile",isAuth, getUserProfile);

export default router;
