"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUserProfile = exports.userImage = exports.getAllUsers = exports.getUserProfile = exports.googleAuth = exports.resetpassword = exports.verifyotp = exports.sendotp = exports.signOut = exports.signIn = exports.signUp = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const cloudinary_1 = __importDefault(require("../../utils/cloudinary"));
const genaretetoken_1 = __importDefault(require("../../utils/genaretetoken"));
const nodemailer_1 = require("../../utils/nodemailer");
const address_model_1 = __importDefault(require("../address/address.model"));
const cart_model_1 = require("../cart/cart.model");
const order_model_1 = __importDefault(require("../order/order.model"));
const review_model_1 = require("../review/review.model");
const user_model_1 = __importDefault(require("../user/user.model"));
const wishlist_model_1 = require("../wishlist/wishlist.model");
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
        const user = await user_model_1.default.findOne({ email });
        if (!user) {
            res.status(401).json({ message: "user does not exist" });
            return;
        }
        await user.populate([
            {
                path: "address_details",
                match: { userId: user._id },
            },
            {
                path: "shopping_cart",
                populate: {
                    path: "products.productId",
                    model: "Product",
                    populate: {
                        path: "category",
                        select: "name"
                    }
                },
            },
            {
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
            }
        ]);
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
            .populate({
            path: "address_details",
            match: { userId: req.userId },
        })
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
        const { name, email, mobile, customerstatus, image, status, verify_email, role, date_of_birth, gender, address_data, // New: address information (object)
        address_details, // Alternative: address information (array)
         } = req.body;
        const user = await user_model_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }
        // Update user profile fields
        if (name !== undefined)
            user.name = name;
        if (email !== undefined)
            user.email = email;
        if (mobile !== undefined)
            user.mobile = mobile;
        if (customerstatus !== undefined)
            user.customerstatus = customerstatus;
        if (image !== undefined)
            user.image = image;
        if (status !== undefined)
            user.status = status;
        if (verify_email !== undefined)
            user.verify_email = verify_email;
        if (role !== undefined)
            user.role = role;
        if (date_of_birth !== undefined) {
            // Handle both "MM/DD/YYYY" and "YYYY-MM-DD" formats
            let parsedDate;
            if (date_of_birth.includes('/')) {
                // Format: "MM/DD/YYYY"
                const [month, day, year] = date_of_birth.split('/').map(Number);
                parsedDate = new Date(Date.UTC(year, month - 1, day));
            }
            else if (date_of_birth.includes('-')) {
                // Format: "YYYY-MM-DD"
                const [year, month, day] = date_of_birth.split('-').map(Number);
                parsedDate = new Date(Date.UTC(year, month - 1, day));
            }
            else {
                // Try to parse as-is
                parsedDate = new Date(date_of_birth);
            }
            // Only set if valid date
            if (!isNaN(parsedDate.getTime())) {
                user.date_of_birth = parsedDate;
            }
        }
        if (gender !== undefined)
            user.gender = gender;
        await user.save();
        // Handle address creation/update if address_data or address_details is provided
        // Support both formats: address_data (object) or address_details (array)
        let addressToProcess = address_data;
        // If address_details array is provided, use the first item
        if (!addressToProcess && address_details && Array.isArray(address_details) && address_details.length > 0) {
            addressToProcess = address_details[0];
        }
        if (addressToProcess) {
            const { _id: addressId, address_line, district, division, upazila_thana, country, pincode, mobile: addressMobile, } = addressToProcess;
            let savedAddress;
            // Determine the address ID to update
            // 1. Use provided ID if available
            // 2. OR fallback to the user's first existing address (prevent duplicates)
            let targetAddressId = addressId;
            if (!targetAddressId && user.address_details && user.address_details.length > 0) {
                targetAddressId = user.address_details[0];
            }
            if (targetAddressId) {
                // Try to update existing address
                savedAddress = await address_model_1.default.findOneAndUpdate({ _id: targetAddressId, userId: user._id }, {
                    address_line: address_line || "",
                    district: district || "",
                    division: division || "",
                    upazila_thana: upazila_thana || "",
                    country: country || "Bangladesh",
                    pincode: pincode || "",
                    mobile: addressMobile || mobile || null,
                }, { new: true });
                // If address not found (wrong ID or belongs to different user), create new one
                if (!savedAddress) {
                    const newAddress = new address_model_1.default({
                        address_line: address_line || "",
                        district: district || "",
                        division: division || "",
                        upazila_thana: upazila_thana || "",
                        country: country || "Bangladesh",
                        pincode: pincode || "",
                        mobile: addressMobile || mobile || null,
                        userId: user._id,
                    });
                    savedAddress = await newAddress.save();
                    // Add address reference to user's address_details array
                    if (!user.address_details.includes(savedAddress._id)) {
                        user.address_details.push(savedAddress._id);
                        await user.save();
                    }
                }
            }
            else {
                // Create new address
                const newAddress = new address_model_1.default({
                    address_line: address_line || "",
                    district: district || "",
                    division: division || "",
                    upazila_thana: upazila_thana || "",
                    country: country || "Bangladesh",
                    pincode: pincode || "",
                    mobile: addressMobile || mobile || null,
                    userId: user._id,
                });
                savedAddress = await newAddress.save();
                // Add address reference to user's address_details array if not already present
                if (!user.address_details.includes(savedAddress._id)) {
                    user.address_details.push(savedAddress._id);
                    await user.save();
                }
            }
        }
        // Populate user data before sending response
        const populatedUser = await user_model_1.default.findById(userId)
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
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const userId = req.params.id;
        const user = await user_model_1.default.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }
        // Delete associated data
        await address_model_1.default.deleteMany({ userId: user._id }).session(session);
        await cart_model_1.CartModel.deleteMany({ userId: user._id }).session(session);
        await order_model_1.default.deleteMany({ userId: user._id }).session(session);
        await wishlist_model_1.WishlistModel.deleteMany({ userId: user._id }).session(session);
        await review_model_1.Review.deleteMany({ userId: user._id }).session(session);
        // Delete the user
        await user_model_1.default.findByIdAndDelete(userId, { session });
        await session.commitTransaction();
        session.endSession();
        res.status(200).json({ success: true, message: "User deleted successfully" });
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
exports.deleteUser = deleteUser;
