import mongoose, { Document, } from "mongoose";
// 1. Interface
export interface ICategory extends Document {
  name: string;
  image?: string;
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}