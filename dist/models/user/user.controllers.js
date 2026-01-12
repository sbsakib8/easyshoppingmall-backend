"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUserProfile = exports.userImage = exports.getAllUsers = exports.getUserProfile = exports.googleAuth = exports.resetpassword = exports.verifyotp = exports.sendotp = exports.signOut = exports.signIn = exports.signUp = void 0;
const cloudinary_1 = __importDefault(require("../../utils/cloudinary"));
const genaretetoken_1 = __importDefault(require("../../utils/genaretetoken"));
const nodemailer_1 = require("../../utils/nodemailer");
const user_model_1 = __importDefault(require("../user/user.model"));
// Cookie 
const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 30 * 24 * 60 * 60 * 1000,
};
// Register User
const signUp = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const userExists = await user_model_1.default.findOne({ email });
        if (userExists) {
            res.status(400).json({ message: "User already exists", success: false });
            return;
        }
        const user = await user_model_1.default.create({ name, email, password, role });
        const token = (0, genaretetoken_1.default)(user._id.toString());
        //  cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        ;
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.signUp = signUp;
// Login User
const signIn = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await user_model_1.default.findOne({ email }).populate("address_details")
            .populate({
            path: "shopping_cart",
            populate: {
                path: "products.productId",
                model: "Product",
                populate: {
                    path: "category",
                    select: "name"
                }
            },
        })
            .populate({
            path: "orderHistory",
            populate: [
                {
                    path: "products.productId",
                    model: "Product",
                    populate: {
                        path: "category",
                        select: "name"
                    }
                },
                {
                    path: "cart",
                    model: "Cart",
                    populate: {
                        path: "products.productId",
                        model: "Product",
                        populate: {
                            path: "category",
                            select: "name"
                        }
                    }
                },
            ],
        });
        if (!user) {
            res.status(401).json({ message: "user does not exist" });
            return;
        }
        const ismatch = await user.comparePassword(password);
        if (!ismatch) {
            res.status(401).json({ message: "incorrect password" });
            return;
        }
        const token = (0, genaretetoken_1.default)(user._id.toString());
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        ;
        res.json({
            success: true,
            message: "User Signin successfully",
            user,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.signIn = signIn;
// Sign out user
const signOut = async (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            path: "/",
        });
        res.status(200).json({
            success: true,
            message: "User signed out successfully",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.signOut = signOut;
// OTP send
const sendotp = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await user_model_1.default.findOne({ email });
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.forgot_password_otp = otp;
        user.forgot_password_expiry = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();
        // Send OTP via email
        await (0, nodemailer_1.sendEmail)(user.email, parseInt(otp), user.name);
        res.status(200).json({ success: true, message: "OTP sent to email", otp });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.sendotp = sendotp;
// verifyotp 
const verifyotp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await user_model_1.default.findOne({ email });
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }
        if (user.forgot_password_otp !== otp) {
            res.status(400).json({ success: false, message: "Invalid OTP" });
            return;
        }
        if (user.forgot_password_expiry && user.forgot_password_expiry < new Date()) {
            res.status(400).json({ success: false, message: "OTP has expired" });
            return;
        }
        user.isotpverified = true;
        user.forgot_password_otp = undefined;
        user.forgot_password_expiry = undefined;
        await user.save();
        res.status(200).json({ success: true, message: "OTP verified successfully" });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.verifyotp = verifyotp;
// reset password
const resetpassword = async (req, res) => {
    try {
        const { email, newpassword } = req.body;
        const user = await user_model_1.default.findOne({ email });
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }
        if (!user.isotpverified) {
            res.status(400).json({ success: false, message: "OTP not verified" });
            return;
        }
        user.password = newpassword;
        user.forgot_password_otp = undefined;
        user.forgot_password_expiry = undefined;
        user.isotpverified = false;
        await user.save();
        res.status(200).json({ success: true, message: "Password reset successfully" });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.resetpassword = resetpassword;
// google login
const googleAuth = async (req, res) => {
    try {
        const { name, email, mobile, image } = req.body;
        let user = await user_model_1.default.findOne({ email });
        if (!user) {
            user = new user_model_1.default({ name, email, mobile, image });
            await user.save();
        }
        const token = (0, genaretetoken_1.default)(user._id.toString());
        res.cookie("token", token, cookieOptions);
        res.status(200).json({
            success: true,
            message: "User logged in with Google successfully",
            id: user._id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            image: user.image,
            role: user.role,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.googleAuth = googleAuth;
// user controller 
const getUserProfile = async (req, res) => {
    const userId = req.userId;
    try {
        if (!req.userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const user = await user_model_1.default.findById(userId)
            .select("-password -refresh_token -forgot_password_otp -forgot_password_expiry -isotpverified")
            .populate("address_details")
            .populate({
            path: "shopping_cart",
            populate: {
                path: "products.productId",
                model: "Product",
                populate: {
                    path: "category",
                    select: "name"
                }
            },
        })
            .populate({
            path: "orderHistory",
            populate: [
                {
                    path: "products.productId",
                    model: "Product",
                    populate: {
                        path: "category",
                        select: "name"
                    }
                },
                {
                    path: "cart",
                    model: "Cart",
                    populate: {
                        path: "products.productId",
                        model: "Product",
                        populate: {
                            path: "category",
                            select: "name"
                        }
                    }
                },
            ],
        });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.status(200).json({ success: true, user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getUserProfile = getUserProfile;
//  get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await user_model_1.default.find().select("-password -refresh_token -forgot_password_otp -forgot_password_expiry -isotpverified").populate("address_details");
        res.status(200).json({ success: true, users });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getAllUsers = getAllUsers;
// user imge push 
const userImage = async (req, res) => {
    try {
        if (req.userId !== req.params.id) {
            return res.status(403).json({ message: "Forbidden" });
        }
        if (!req.file) {
            return res.status(400).json({ message: "No image file provided" });
        }
        const imageUrl = await (0, cloudinary_1.default)(req.file.buffer);
        const user = await user_model_1.default.findByIdAndUpdate(req.userId, { image: imageUrl }, { new: true })
            .select("-password")
            .populate("address_details")
            .populate({
            path: "shopping_cart",
            populate: {
                path: "products.productId",
                model: "Product",
                populate: {
                    path: "category",
                    select: "name"
                }
            },
        })
            .populate({
            path: "orderHistory",
            populate: [
                {
                    path: "products.productId",
                    model: "Product",
                    populate: {
                        path: "category",
                        select: "name"
                    }
                },
                {
                    path: "cart",
                    model: "Cart",
                    populate: {
                        path: "products.productId",
                        model: "Product",
                        populate: {
                            path: "category",
                            select: "name"
                        }
                    }
                },
            ],
        });
        res.status(200).json({
            success: true,
            message: "Profile image updated successfully",
            user,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.userImage = userImage;
// user update profile
const updateUserProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        if (req.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: "Forbidden",
            });
        }
        const { name, email, mobile, gender, date_of_birth, address_details, // ✅ correct field
         } = req.body;
        const user = await user_model_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        if (name)
            user.name = name;
        if (email)
            user.email = email;
        if (mobile)
            user.mobile = mobile;
        if (gender)
            user.gender = gender;
        if (date_of_birth)
            user.date_of_birth = date_of_birth;
        // ✅ update address ONLY if provided
        if (address_details) {
            user.address_details = Array.isArray(address_details)
                ? address_details
                : [address_details];
        }
        await user.save();
        const populatedUser = await user_model_1.default.findById(user._id)
            .select("-password -refresh_token -forgot_password_otp -forgot_password_expiry -isotpverified")
            .populate("address_details")
            .populate({
            path: "shopping_cart",
            populate: {
                path: "products.productId",
                populate: { path: "category", select: "name" },
            },
        })
            .populate({
            path: "orderHistory",
            populate: [
                {
                    path: "products.productId",
                    populate: { path: "category", select: "name" },
                },
                {
                    path: "cart",
                    populate: {
                        path: "products.productId",
                        populate: { path: "category", select: "name" },
                    },
                },
            ],
        });
        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: populatedUser,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.updateUserProfile = updateUserProfile;
// delete user
const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await user_model_1.default.findByIdAndDelete(userId);
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }
        res.status(200).json({ success: true, message: "User deleted successfully" });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.deleteUser = deleteUser;
