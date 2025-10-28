import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Notification from "./notification.model";
import { INotification } from "./interface";

type SocketRequest = Request & { app: any };

// createNotification notification 
export const createNotification = asyncHandler(
  async (req: SocketRequest, res: Response): Promise<void> => {
    const { title, message, type, referenceId, meta } = req.body;

    if (!title || !message) {
      res.status(400);
      throw new Error("title and message are required");
    }

    const notif: INotification = await Notification.create({
      title,
      message,
      type,
      referenceId,
      meta,
    });

    const io = req.app?.get("io");
    if (io) io.emit("notification:new", notif);

    res.status(201).json({ success: true, data: notif });
  }
);

// getNotifications notification 
export const getNotifications = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "30", 10);
    const unreadOnly = req.query.unreadOnly === "true";

    const filter = unreadOnly ? { isRead: false } : {};

    const total = await Notification.countDocuments(filter);
    const data = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      total,
      page,
      limit,
      data,
    });
  }
);

/// markAsRead notification 
export const markAsRead = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const notif = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notif) {
      res.status(404);
      throw new Error("Notification not found");
    }

    res.json({ success: true, data: notif });
  }
);

// markAllAsRead notification 
export const markAllAsRead = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ success: true });
  }
);

  // Delete notification 
export const deleteNotification = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const notif = await Notification.findByIdAndDelete(req.params.id);

    if (!notif) {
      res.status(404);
      throw new Error("Notification not found");
    }

    res.json({ success: true });
  }
);
