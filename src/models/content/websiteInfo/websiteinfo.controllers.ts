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
    } else if (data.countdownDays !== undefined || data.countdownHours !== undefined) {
      const now = new Date();
      const days = Number(data.countdownDays) || 0;
      const hours = Number(data.countdownHours) || 0;
      const minutes = Number(data.countdownMinutes) || 0;
      const seconds = Number(data.countdownSeconds) || 0;

      const newTarget = new Date(now.getTime() +
        (days * 24 * 60 * 60 * 1000) +
        (hours * 60 * 60 * 1000) +
        (minutes * 60 * 1000) +
        (seconds * 1000)
      );
      data.countdownTargetDate = newTarget;
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
    let info = await WebsiteInfo.find();

    // Dynamically recalculate countdown for each record to ensure it's not stale
    const updatedInfo = info.map(item => {
      const plainItem = item.toObject();
      if (plainItem.countdownTargetDate) {
        const countdown = calculateCountdown(plainItem.countdownTargetDate);
        Object.assign(plainItem, {
          countdownDays: countdown.days,
          countdownHours: countdown.hours,
          countdownMinutes: countdown.minutes,
          countdownSeconds: countdown.seconds,
        });
      }
      return plainItem;
    });

    res.status(200).json({ success: true, data: updatedInfo });
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
    } else if (data.countdownDays !== undefined || data.countdownHours !== undefined) {
      // If user provided days/hours manualy, calculate a new target date from NOW
      const now = new Date();
      const days = Number(data.countdownDays) || 0;
      const hours = Number(data.countdownHours) || 0;
      const minutes = Number(data.countdownMinutes) || 0;
      const seconds = Number(data.countdownSeconds) || 0;

      const newTarget = new Date(now.getTime() +
        (days * 24 * 60 * 60 * 1000) +
        (hours * 60 * 60 * 1000) +
        (minutes * 60 * 1000) +
        (seconds * 1000)
      );
      data.countdownTargetDate = newTarget;
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
