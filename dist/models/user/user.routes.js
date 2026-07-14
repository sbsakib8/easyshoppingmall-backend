"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const isAuth_1 = require("../../middlewares/isAuth");
const isDashboardAccess_1 = require("../../middlewares/isDashboardAccess");
const multer_1 = require("../../middlewares/multer");
const decryptBody_1 = require("../../middlewares/decryptBody");
const user_controllers_1 = require("./user.controllers");
const router = express_1.default.Router();
router.post("/signup", decryptBody_1.decryptBody, user_controllers_1.signUp);
router.post("/signin", decryptBody_1.decryptBody, user_controllers_1.signIn);
router.get("/signout", user_controllers_1.signOut);
// reset password
router.post("/send-otp", decryptBody_1.decryptBody, user_controllers_1.sendotp);
router.post("/verify-otp", decryptBody_1.decryptBody, user_controllers_1.verifyotp);
router.post("/reset-password", decryptBody_1.decryptBody, user_controllers_1.resetpassword);
// google auth
router.post("/google-auth", user_controllers_1.googleAuth);
//  user routes
router.get("/userprofile", isAuth_1.isAuth, user_controllers_1.getUserProfile);
router.get("/getallusers", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("customers"), user_controllers_1.getAllUsers);
router.get("/userprofile/:id", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("settings"), user_controllers_1.getUserById);
router.delete("/userdelete/:id", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("customers"), user_controllers_1.deleteUser);
router.put("/userupdate/:id", isAuth_1.isAuth, (0, isDashboardAccess_1.isDashboardAccess)("settings"), decryptBody_1.decryptBody, user_controllers_1.updateUserProfile);
router.put("/user-image/:id", isAuth_1.isAuth, multer_1.upload.single("image"), user_controllers_1.userImage);
exports.default = router;
