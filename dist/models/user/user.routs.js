"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controllers_1 = require("./user.controllers");
const isAuth_1 = require("../../middlewares/isAuth");
const multer_1 = require("../../middlewares/multer");
const router = express_1.default.Router();
router.post("/signup", user_controllers_1.signUp);
router.post("/signin", user_controllers_1.signIn);
router.get("/signout", user_controllers_1.signOut);
// reset password
router.post("/send-otp", user_controllers_1.sendotp);
router.post("/verify-otp", user_controllers_1.verifyotp);
router.post("/reset-password", user_controllers_1.resetpassword);
// google auth
router.post("/google-auth", user_controllers_1.googleAuth);
//  user routes
router.get("/userprofile", isAuth_1.isAuth, user_controllers_1.getUserProfile);
router.post("/user-image/:id", isAuth_1.isAuth, multer_1.upload.single("image"), user_controllers_1.userImage);
exports.default = router;
