import { Schema, model, Document } from "mongoose";
import { INotification } from "./interface";


const NotificationSchema: Schema<INotification> = new Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      required: true,
    },
    referenceId: { type: String, default: null },
    isRead: { type: Boolean, default: false },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

// TTL Index: auto-delete notifications after 2 days (172800s)
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 172800 });

const Notification = model<INotification>("Notification", NotificationSchema);
export default Notification;
