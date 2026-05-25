import { Request, Response } from "express";
import Referral from "./referral.model";

// Get Referral settings
export const getReferralSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    let settings = await Referral.findOne();
    if (!settings) {
      settings = new Referral({
        referralPercentage: 0,
        referralBonusPerProduct: 0
      });
      await settings.save();
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error: any) {
    console.error("Get Referral Settings Error:", error);
    res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

// Update Referral settings
export const updateReferralSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { referralPercentage, referralBonusPerProduct } = req.body;
    
    let settings = await Referral.findOne();
    
    const updateData = {
      referralPercentage: Number(referralPercentage) || 0,
      referralBonusPerProduct: Number(referralBonusPerProduct) || 0
    };

    if (!settings) {
      settings = new Referral(updateData);
      await settings.save();
    } else {
      settings = await Referral.findByIdAndUpdate(settings._id, updateData, { new: true }) as any;
    }

    res.status(200).json({ success: true, message: "Referral settings updated successfully", data: settings });
  } catch (error: any) {
    console.error("Update Referral Settings Error:", error);
    res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};
