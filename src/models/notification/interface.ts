export interface INotification extends Document {
  title: string;
  message: string;
  type: "order" | "user" | "stock" | "system" | "other";
  referenceId?: string | null;
  isRead: boolean;
  meta?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}