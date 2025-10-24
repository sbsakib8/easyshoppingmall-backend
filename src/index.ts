import express from "express"
import type { Application, Request, Response } from "express";
import cors from "cors";
import connectDB from "./config/db.connect";
import userRoutes from "./models/user/user.routs";
import cookieParser from "cookie-parser";
import productRouter from "./models/product/product.routs";
import addressRouter from "./models/address/address.routs";
import categoryRoutes from "./models/category/category.routs"
import subcategoriesRoutes from "./models/subcategory/subcategory.routs"
import homeBannerRoutes from "./models/banners/homeBanner/homeBanner.routs";
import centerBannerRoutes from "./models/banners/centerBanner/centerBanner.routs";
import leftBannerRoutes from "./models/banners/leftBanner/leftBanner.routs";
import RightBannerRoutes from "./models/banners/rightBanner/rightBanner.routs";
import blogRoutes from "./models/content/blogs/blogs.routs";
// middleware
const app: Application = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors(
  {
    origin: ["http://localhost:3000","https://easyshopingmall-b14r.vercel.app/"],
    credentials: true,
  }
));
// mongodb 
connectDB()

//  route
app.use("/api/users", userRoutes); 
app.use("/api/products", productRouter );
app.use("/api/address", addressRouter );
app.use("/api/categories", categoryRoutes);
app.use("/api/subcategories", subcategoriesRoutes);
app.use("/api/homeBannerRoutes", homeBannerRoutes);
app.use("/api/CenterBanner", centerBannerRoutes);
app.use("/api/LeftBanner", leftBannerRoutes);
app.use("/api/RightBanner", RightBannerRoutes);
app.use("/api/blog", blogRoutes);



app.get("/", (req: Request, res: Response) => {
  res.send("APi  is running...");
});

export default app;