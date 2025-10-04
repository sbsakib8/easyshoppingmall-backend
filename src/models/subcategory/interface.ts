import { Document, Types } from "mongoose";

export interface ISubCategory {
  _id?: string;
  name: string;
  slug?: string;
  image?: string;
  icon?: string;
  isActive?: boolean;
  metaDescription?: string;
  metaTitle?: string;
  category: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}