"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReferralSettings = exports.getReferralSettings = void 0;
const referral_model_1 = __importDefault(require("./referral.model"));
// Get Referral settings
const getReferralSettings = async (req, res) => {
    try {
        let settings = await referral_model_1.default.findOne();
        if (!settings) {
            settings = new referral_model_1.default({
                referralPercentage: 0,
                referralBonusPerProduct: 0
            });
            await settings.save();
        }
        res.status(200).json({ success: true, data: settings });
    }
    catch (error) {
        console.error("Get Referral Settings Error:", error);
        res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};
exports.getReferralSettings = getReferralSettings;
// Update Referral settings
const updateReferralSettings = async (req, res) => {
    try {
        const { referralPercentage, referralBonusPerProduct } = req.body;
        let settings = await referral_model_1.default.findOne();
        const updateData = {
            referralPercentage: Number(referralPercentage) || 0,
            referralBonusPerProduct: Number(referralBonusPerProduct) || 0
        };
        if (!settings) {
            settings = new referral_model_1.default(updateData);
            await settings.save();
        }
        else {
            settings = await referral_model_1.default.findByIdAndUpdate(settings._id, updateData, { new: true });
        }
        res.status(200).json({ success: true, message: "Referral settings updated successfully", data: settings });
    }
    catch (error) {
        console.error("Update Referral Settings Error:", error);
        res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};
exports.updateReferralSettings = updateReferralSettings;
