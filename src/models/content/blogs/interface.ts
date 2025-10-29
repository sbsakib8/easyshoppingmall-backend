export interface IBlog extends Document {
  title: string;
  author: string;
  category: string;
  status: "Draft" | "Published";
  image?: string;
  excerpt: string;
  content: string;
  createdAt: Date;
  createdDateBn: string;
  createdTimeBn: string;
  updatedDateBn?: string;
  updatedTimeBn?: string;
}