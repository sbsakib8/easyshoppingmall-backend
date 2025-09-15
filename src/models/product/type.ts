import { Document, Types } from "mongoose";

export interface IProduct extends Document {
  name: string;
  sku?: string;  // SKU field
  image: string[];
  category: Types.ObjectId[];
  subCategory: Types.ObjectId[];
  brand?: string;
  tags?: string[];
  featured?: boolean;
  unit?: string;
  weight?: number | null;
  size?: string;
  rank?: number;
  stock?: number | null;
  price?: number | null;
  discount?: number | null;
  description?: string;
  more_details?: Record<string, any>;
  publish?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// product/type.ts
export interface IProduct extends Document {
  name: string;
  image: string[];
  category: Types.ObjectId[];
  subCategory: Types.ObjectId[];
  brand?: string;
  tags?: string[];
  featured?: boolean;
  unit?: string;
  weight?: number | null;
  size?: string;
  rank?: number;
  stock?: number | null;
  price?: number | null;
  discount?: number | null;
  description?: string;
  more_details?: Record<string, any>;
  publish?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
