import express from "express";
import { deleteUser, getAllUsers, getUserProfile, googleAuth, resetpassword, sendotp, signIn, signOut, signUp, updateUserProfile, userImage, verifyotp } from "./user.controllers";
import { isAuth } from "../../middlewares/isAuth";
import { upload } from "../../middlewares/multer";
import { isAdmin } from "../../middlewares/isAdmin";

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
router.get("/getallusers",isAuth,isAdmin, getAllUsers);
router.delete("/userdelete/:id", isAuth, isAdmin, deleteUser);
router.put("/userupdate/:id",isAuth,isAdmin, updateUserProfile);
router.post("/user-image/:id",isAuth,upload.single("image"), userImage);


export default router;
