import express from "express";
import { getUserProfile, googleAuth, resetpassword, sendotp, signIn, signOut, signUp, userImage, verifyotp } from "./user.controllers";
import { isAuth } from "../../middlewares/isAuth";
import { upload } from "../../middlewares/multer";

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
router.post("/user-image/:id",isAuth,upload.single("image"), userImage);


export default router;
