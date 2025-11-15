import { Request, Response } from "express";
import WebsiteInfo from "./websiteinfo.model";

//  Helper: Countdown calculator
const calculateCountdown = (targetDate: Date) => {
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  const diff = Math.max(target - now, 0);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
};

//  Create
export const createWebsiteInfo = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    if (data.countdownTargetDate) {
      const countdown = calculateCountdown(data.countdownTargetDate);
      Object.assign(data, {
        countdownDays: countdown.days,
        countdownHours: countdown.hours,
        countdownMinutes: countdown.minutes,
        countdownSeconds: countdown.seconds,
      });
    }

    const newInfo = new WebsiteInfo(data);
    const saved = await newInfo.save();

    res.status(201).json({ success: true, message: "Website info created", data: saved });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Get All
export const getAllWebsiteInfo = async (_req: Request, res: Response) => {
  try {
    const info = await WebsiteInfo.find();
    res.status(200).json({ success: true, data: info });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


//  Update
export const updateWebsiteInfo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (data.countdownTargetDate) {
      const countdown = calculateCountdown(data.countdownTargetDate);
      Object.assign(data, {
        countdownDays: countdown.days,
        countdownHours: countdown.hours,
        countdownMinutes: countdown.minutes,
        countdownSeconds: countdown.seconds,
      });
    }

    const updated = await WebsiteInfo.findByIdAndUpdate(id, data, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });

    res.status(200).json({ success: true, message: "Updated successfully", data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Delete
export const deleteWebsiteInfo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await WebsiteInfo.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Not found" });

    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
