import { Document, Types } from "mongoose";

export interface INotice extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  keyPoints?: string[];
  button?: {
    text?: string;
    color?: string;
    url?: string;
  };
  isActive: boolean;
  priority: number;
  createdAt?: Date;
  updatedAt?: Date;
}
