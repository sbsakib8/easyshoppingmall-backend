"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetpassword = exports.verifyotp = exports.sendotp = exports.getUserProfile = exports.signOut = exports.signIn = exports.signUp = void 0;
const user_model_1 = __importDefault(require("../user/user.model"));
const genaretetoken_1 = __importDefault(require("../../utils/genaretetoken"));
const nodemailer_1 = require("../../utils/nodemailer");
// Cookie 
const cookieOptions = {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
};
// Register User
const signUp = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const userExists = await user_model_1.default.findOne({ email });
        if (userExists) {
            res.status(400).json({ message: "User already exists", success: false });
            return;
        }
        const user = await user_model_1.default.create({ name, email, password });
        const token = (0, genaretetoken_1.default)(user._id.toString());
        //  cookie
        res.cookie("token", token, cookieOptions);
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
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
        const user = await user_model_1.default.findOne({ email });
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
        res.cookie("token", token, cookieOptions);
        res.json({
            success: true,
            message: "User Signin successfully",
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
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
        res.clearCookie("token");
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
// Get User Profile (password excluded)
const getUserProfile = async (req, res) => {
    try {
        const user = await user_model_1.default.findById(req.params.id).select("-password");
        if (user) {
            res.json(user);
        }
        else {
            res.status(404).json({ message: "User not found" });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getUserProfile = getUserProfile;
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
