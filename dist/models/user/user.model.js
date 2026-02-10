"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
const userSchema = new mongoose_1.default.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
    },
    mobile: {
        type: String,
        default: null
    },
    image: {
        type: String,
        default: null
    },
    refresh_token: {
        type: String,
        default: ""
    },
    verify_email: {
        type: Boolean,
        default: false
    },
    last_login_date: {
        type: Date,
        default: ""
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Blocked'],
        default: "Active"
    },
    customerstatus: {
        type: String,
        enum: ['NewCustomer', 'TopCustomer', 'ReturningCustomer', 'VIPCustomer', 'WholesaleCustomer', 'Reseller', '3starCustomer', '4starCustomer', '5starCustomer'],
        default: "NewCustomer"
    },
    address_details: [
        {
            type: mongoose_1.default.Schema.ObjectId,
            ref: 'Address'
        }
    ],
    shopping_cart: [
        {
            type: mongoose_1.default.Schema.ObjectId,
            ref: 'Cart'
        }
    ],
    orderHistory: [
        {
            type: mongoose_1.default.Schema.ObjectId,
            ref: 'Order'
        }
    ],
    forgot_password_otp: {
        type: String,
        default: null
    },
    forgot_password_expiry: {
        type: Date,
        default: ""
    },
    isotpverified: {
        type: Boolean,
        default: false
    },
    role: {
        type: String,
        enum: ['ADMIN', "USER", "INVESTMENT", "SELLERPROGRAM", "BOXLEADER", "DROPSHIPPING"],
        default: "USER"
    },
    date_of_birth: {
        type: Date,
        default: null,
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        default: null,
    }
}, { timestamps: true });
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ role: 1, date_of_birth: 1 });
userSchema.pre("save", async function (next) {
    if (!this.isModified("password"))
        return next();
    const salt = await bcryptjs_1.default.genSalt(10);
    this.password = await bcryptjs_1.default.hash(this.password, salt);
    next();
});
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcryptjs_1.default.compare(candidatePassword, this.password);
};
exports.default = mongoose_1.default.model("User", userSchema);
