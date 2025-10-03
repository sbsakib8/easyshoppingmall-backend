import mongoose, { Document, } from "mongoose";
// 1. Interface
export interface ICategory {
  _id?: string; 
  name: string;
  image?: string;
  slug?: string;
  icon?: string;
  isActive?: boolean;
  metaDescription?: string;
  metaTitle?: string;
  createdAt?: Date;
  updatedAt?: Date;
}