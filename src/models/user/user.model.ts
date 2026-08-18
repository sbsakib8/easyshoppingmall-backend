import bcrypt from "bcryptjs";
import mongoose, { Document, Schema, Types } from "mongoose";

export interface IUser extends Document {
    _id: Types.ObjectId;
    name: string;
    email: string;
    password: string;
    mobile?: string | null;
    image?: string | null;
    refresh_token?: string;
    verify_email?: boolean;
    last_login_date?: Date | null;
    status: "Active" | "Inactive" | "Blocked";
    customerstatus: "NewCustomer" | "TopCustomer" | "ReturningCustomer" | "VIPCustomer" | "WholesaleCustomer" | "Reseller" | "3starCustomer" | "4starCustomer" | "5starCustomer";
    address_details: Types.ObjectId[];
    shopping_cart: Types.ObjectId[];
    orderHistory: Types.ObjectId[];
    forgot_password_otp?: string | null;
    forgot_password_expiry?: Date | null;
    isotpverified?: boolean;
    role: "ADMIN" | "USER" | "INVESTMENT" | "SELLERPROGRAM" | "BOXLEADER" | "DROPSHIPPING" | "MANAGER" | "CPO";
    roles: ("ADMIN" | "USER" | "INVESTMENT" | "SELLERPROGRAM" | "BOXLEADER" | "DROPSHIPPING" | "MANAGER" | "CPO")[];
    date_of_birth?: Date | null;
    gender?: "Male" | "Female" | "Other" | null;
    referralCode?: string | null;
    referredBy?: Types.ObjectId | null;
    tokenVersion?: number;
    referralCount?: number;
    deliveredItemsCount?: number;
    balance?: number;
    shopName?: string | null;
    shopLogo?: string | null;
    facebookPage?: string | null;
    whatsappNumber?: string | null;
    shopAddress?: string | null;
    shopWebsite?: string | null;
    paymentDetails?: {
        bkash?: string | null;
        nagad?: string | null;
        rocket?: string | null;
        bank?: string | null;
    } | null;
    createdAt?: Date;
    updatedAt?: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema: Schema<IUser> = new mongoose.Schema(
    {
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
                type: mongoose.Schema.ObjectId,
                ref: 'Address'
            }
        ],
        shopping_cart: [
            {
                type: mongoose.Schema.ObjectId,
                ref: 'Cart'
            }
        ],
        orderHistory: [
            {
                type: mongoose.Schema.ObjectId,
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
            enum: ['ADMIN', "USER", "INVESTMENT", "SELLERPROGRAM", "BOXLEADER", "DROPSHIPPING", "MANAGER", "CPO"],
            default: "USER"
        },
        roles: {
            type: [String],
            enum: ['ADMIN', "USER", "INVESTMENT", "SELLERPROGRAM", "BOXLEADER", "DROPSHIPPING", "MANAGER", "CPO"],
            default: ["USER"]
        },
        date_of_birth: {
            type: Date,
            default: null,
        },
        gender: {
            type: String,
            enum: ["Male", "Female", "Other"],
            default: null,
        },
        referralCode: {
            type: String,
            unique: true,
            sparse: true,
            default: null
        },
        referredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        tokenVersion: {
            type: Number,
            default: 0
        },
        referralCount: {
            type: Number,
            default: 0
        },
        deliveredItemsCount: {
            type: Number,
            default: 0
        },
        balance: {
            type: Number,
            default: 0
        },
        shopName: {
            type: String,
            default: null
        },
        shopLogo: {
            type: String,
            default: null
        },
        facebookPage: {
            type: String,
            default: null
        },
        whatsappNumber: {
            type: String,
            default: null
        },
        shopAddress: {
            type: String,
            default: null
        },
        shopWebsite: {
            type: String,
            default: null
        },
        paymentDetails: {
            bkash: { type: String, default: null },
            nagad: { type: String, default: null },
            rocket: { type: String, default: null },
            bank: { type: String, default: null }
        }
    },
    { timestamps: true }
);

// SYNC role to roles array before save
userSchema.pre("save", function (next) {
    if (this.role && !this.roles.includes(this.role)) {
        this.roles.push(this.role);
    }
    next();
});

userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ role: 1, date_of_birth: 1 });

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string) {
    return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>("User", userSchema);
