import { Document, Types } from "mongoose";

export interface IProduct extends Document {
    productName: string;
    description: string;
    category: Types.ObjectId[];
    subCategory: Types.ObjectId[];
    featured: boolean;
    brand: string;
    productWeight: string[];
    productSize: string[];
    color: string[];
    price: number | null;
    productStock: number | null;
    productRank: number;
    discount: number | null;
    ratings: number;
    tags: string[];
    productStatus: ('hot' | 'cold')[];
    images: string[];
    video: string[];
    video_link?: string | null;
    more_details?: Record<string, any>;
    gender?: string;
    publish?: boolean;
    sku?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}
