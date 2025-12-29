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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const cartSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    products: [
        {
            productId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },
            quantity: {
                type: Number,
                default: 1,
                min: [1, "Quantity cannot be less than 1"],
            },
            price: {
                type: Number,
                default: 0,
            },
            totalPrice: {
                type: Number,
                default: 0,
            },
            size: { type: String },
            color: { type: String },
            weight: { type: String },
        },
    ],
    subTotalAmt: { type: Number, default: 0 },
    totalAmt: { type: Number, default: 0 },
}, { timestamps: true });
// Pre-save hook to update totals
cartSchema.pre("save", function (next) {
    this.subTotalAmt = this.products.reduce((acc, item) => acc + item.totalPrice, 0);
    this.totalAmt = this.subTotalAmt;
    next();
});
exports.CartModel = mongoose_1.default.model("Cart", cartSchema);
