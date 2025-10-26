import { Document } from "mongoose";

export interface IContact extends Document {
  name: string;
  email: string;
  phone?: string;   
  subject: string;
  message: string;
  createdAt?: Date;
  updatedAt?: Date;
}
