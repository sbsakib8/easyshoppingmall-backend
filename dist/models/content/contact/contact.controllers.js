"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMessage = exports.getMessages = exports.createMessage = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const contact_model_1 = __importDefault(require("./contact.model"));
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = __importDefault(require("../../../config"));
dotenv_1.default.config();
const createMessage = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        //  Save to MongoDB
        const newMessage = await contact_model_1.default.create({
            name,
            email,
            phone,
            subject,
            message,
        });
        //  Email Configuration
        const transporter = nodemailer_1.default.createTransport({
            service: "Gmail",
            port: 465,
            secure: true,
            auth: {
                user: config_1.default?.email,
                pass: config_1.default?.pass,
            },
        });
        //  Send Email
        await transporter.sendMail({
            from: `"Contact Form" <${config_1.default?.email}>`,
            to: config_1.default?.receiveremail,
            subject: `New Contact Submission: ${subject}`,
            html: `
        <h2>New Message Received</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "N/A"}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong> ${message}</p>
      `,
        });
        //  Response
        res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: newMessage,
        });
    }
    catch (error) {
        console.error("Error in createMessage:", error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Internal Server Error",
        });
    }
};
exports.createMessage = createMessage;
//  Get All
const getMessages = async (_req, res) => {
    try {
        const messages = await contact_model_1.default.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: messages.length, data: messages });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMessages = getMessages;
//  Delete Single
const deleteMessage = async (req, res) => {
    try {
        const msg = await contact_model_1.default.findByIdAndDelete(req.params.id);
        if (!msg) {
            return res.status(404).json({ success: false, message: "Message Not Found" });
        }
        res.status(200).json({ success: true, message: "Deleted Successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteMessage = deleteMessage;
