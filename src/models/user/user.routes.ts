import express from "express";
import { isAuth } from "../../middlewares/isAuth";
import { isDashboardAccess } from "../../middlewares/isDashboardAccess";
import { upload } from "../../middlewares/multer";
import { decryptBody } from "../../middlewares/decryptBody";
import { deleteUser, getAllUsers, getUserProfile, googleAuth, resetpassword, sendotp, signIn, signOut, signUp, updateUserProfile, userImage, verifyotp } from "./user.controllers";

const router = express.Router();

router.post("/signup", decryptBody, signUp);
router.post("/signin", decryptBody, signIn);
router.get("/signout", signOut);

// reset password
router.post("/send-otp", decryptBody, sendotp);
router.post("/verify-otp", decryptBody, verifyotp);
router.post("/reset-password", decryptBody, resetpassword);

// google auth
router.post("/google-auth", googleAuth);

//  user routes
router.get("/userprofile", isAuth, getUserProfile);
router.get("/getallusers", isAuth, isDashboardAccess("customers"), getAllUsers);
router.delete("/userdelete/:id", isAuth, isDashboardAccess("customers"), deleteUser);
router.put("/userupdate/:id", isAuth, updateUserProfile);
router.put("/user-image/:id", isAuth, upload.single("image"), userImage);


export default router;
