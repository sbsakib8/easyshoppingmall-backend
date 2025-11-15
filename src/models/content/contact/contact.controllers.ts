import { Request, Response } from "express";
import nodemailer from "nodemailer";
import Contact from "./contact.model";
import dotenv from "dotenv";
import processdata from "../../../config";

dotenv.config();

export const createMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, subject, message } = req.body as {
      name: string;
      email: string;
      phone?: string;
      subject: string;
      message: string;
    };

    //  Save to MongoDB
    const newMessage = await Contact.create({
      name,
      email,
      phone,
      subject,
      message,
    });

    //  Email Configuration
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      port: 465,
      secure: true,
      auth: {
        user: processdata?.email as string,
        pass: processdata?.pass as string,
      },
    });

    //  Send Email
    await transporter.sendMail({
      from: `"Contact Form" <${processdata?.email}>`,
      to: processdata?.receiveremail,
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
  } catch (error) {
    console.error("Error in createMessage:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

//  Get All
export const getMessages = async (_req: Request, res: Response) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: messages.length, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Delete Single
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const msg = await Contact.findByIdAndDelete(req.params.id);

    if (!msg) {
      return res.status(404).json({ success: false, message: "Message Not Found" });
    }

    res.status(200).json({ success: true, message: "Deleted Successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};