"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWebsiteInfo = exports.updateWebsiteInfo = exports.getAllWebsiteInfo = exports.createWebsiteInfo = void 0;
const websiteinfo_model_1 = __importDefault(require("./websiteinfo.model"));
//  Helper: Countdown calculator
const calculateCountdown = (targetDate) => {
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
const createWebsiteInfo = async (req, res) => {
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
        const newInfo = new websiteinfo_model_1.default(data);
        const saved = await newInfo.save();
        res.status(201).json({ success: true, message: "Website info created", data: saved });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createWebsiteInfo = createWebsiteInfo;
//  Get All
const getAllWebsiteInfo = async (_req, res) => {
    try {
        const info = await websiteinfo_model_1.default.find();
        res.status(200).json({ success: true, data: info });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllWebsiteInfo = getAllWebsiteInfo;
//  Update
const updateWebsiteInfo = async (req, res) => {
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
        const updated = await websiteinfo_model_1.default.findByIdAndUpdate(id, data, { new: true });
        if (!updated)
            return res.status(404).json({ success: false, message: "Not found" });
        res.status(200).json({ success: true, message: "Updated successfully", data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateWebsiteInfo = updateWebsiteInfo;
//  Delete
const deleteWebsiteInfo = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await websiteinfo_model_1.default.findByIdAndDelete(id);
        if (!deleted)
            return res.status(404).json({ success: false, message: "Not found" });
        res.status(200).json({ success: true, message: "Deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteWebsiteInfo = deleteWebsiteInfo;
