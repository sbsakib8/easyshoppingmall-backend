"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const couponSchema = new mongoose_1.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
    },
    description: {
        type: String,
        default: "",
        maxlength: [500, "Description cannot exceed 500 characters"],
    },
    discountType: {
        type: String,
        enum: ["percentage", "flat"],
        required: true,
    },
    discountAmount: {
        type: Number,
        required: true,
        min: [0, "Discount amount cannot be negative"],
    },
    maxDiscountAmount: {
        type: Number,
        default: 0,
        min: [0, "Max discount amount cannot be negative"],
    },
    minOrderAmount: {
        type: Number,
        required: true,
        default: 0,
        min: [0, "Min order amount cannot be negative"],
    },
    validFrom: {
        type: Date,
        default: Date.now,
    },
    validUntil: {
        type: Date,
        required: true,
        validate: {
            validator: function (val) {
                return !this.validFrom || val >= this.validFrom;
            },
            message: "validUntil must be greater than or equal to validFrom",
        },
    },
    usageLimit: {
        type: Number,
        default: 0,
        min: [0, "Usage limit cannot be negative"],
    },
    usedCount: {
        type: Number,
        default: 0,
        min: [0, "Used count cannot be negative"],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    applicableCategory: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Category",
        default: null,
    },
    applicableSubCategory: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "SubCategory",
        default: null,
    },
    applicableProduct: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Product", // Confirmed product model is "Product"
        default: null,
    },
    isForNewUserOnly: {
        type: Boolean,
        default: false,
    },
    perUserLimit: {
        type: Number,
        default: 0,
        min: [0, "Per-user limit cannot be negative"],
    },
}, { timestamps: true });
const CouponModel = mongoose_1.default.model("Coupon", couponSchema);
exports.default = CouponModel;
