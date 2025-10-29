export interface INotification extends Document {
  title: string;
  message: string;
  type: string;
  referenceId?: string | null;
  isRead: boolean;
  meta?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}