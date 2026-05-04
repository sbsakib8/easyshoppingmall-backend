import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import type { Application, Request, Response, NextFunction } from "express";
import express from "express";
import connectDB from "./config/db.connect";


import addressRouter from "./models/address/address.routes";
import centerBannerRoutes from "./models/banners/centerBanner/centerBanner.routes";
import homeBannerRoutes from "./models/banners/homeBanner/homeBanner.routes";
import leftBannerRoutes from "./models/banners/leftBanner/leftBanner.routes";
import RightBannerRoutes from "./models/banners/rightBanner/rightBanner.routes";
import cartRouter from './models/cart/cart.routes';
import categoryRoutes from "./models/category/category.routes";
import blogRoutes from "./models/content/blogs/blogs.routes";
import contactRoutes from "./models/content/contact/contact.routes";
import websiteInfo from "./models/content/websiteInfo/websiteinfo.routes";
import notifications from "./models/notification/notification.routes";
import orderRoute from './models/order/order.routes';
import paymentRouter from './models/payment/payment.route';

import errorHandler from "./middlewares/errorHandler";
import adminRoutes from './models/admin/admin.route';
import productRouter from "./models/product/product.routes";
import reviewRouter from './models/review/review.routes';
import subcategoriesRoutes from "./models/subcategory/subcategory.routes";
import userRoutes from "./models/user/user.routes";
import wishlistRouter from './models/wishlist/wishlist.routes';
import couponRouter from './models/coupon/coupon.routes';

// middleware
const app: Application = express();


app.set("trust proxy", 1);

app.use(compression()); // Compress all responses
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// cors
app.use(cors(
  {
    origin: [
      "http://localhost:3000",
      "https://easyshoppingmallbd.com",
      "https://www.easyshoppingmallbd.com",
      "https://easyshoppingmallbd.vercel.app"
    ],
    credentials: true,
  }
));


// Ensure database is connected before processing any requests (Crucial for Vercel Serverless)
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

//  route
import analyticsRoutes from "./models/analytics/analytics.routes";

app.use("/api/users", userRoutes);
app.use("/api/products", productRouter);
app.use("/api/address", addressRouter);
app.use("/api/categories", categoryRoutes);
app.use("/api/subcategories", subcategoriesRoutes);
app.use("/api/homeBannerRoutes", homeBannerRoutes);
app.use("/api/CenterBanner", centerBannerRoutes);
app.use("/api/LeftBanner", leftBannerRoutes);
app.use("/api/RightBanner", RightBannerRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/websiteinfo", websiteInfo);
app.use("/api/contact", contactRoutes);
app.use("/api/notification", notifications);
app.use("/api/cart", cartRouter)
app.use("/api/orders", orderRoute)
app.use("/api/wishlist", wishlistRouter)
app.use("/api/payment", paymentRouter)
app.use('/api/review', reviewRouter)
app.use("/api/coupon", couponRouter)

app.use("/api/analytics", analyticsRoutes);

app.use("/api/admin", adminRoutes)


app.get("/", (req: Request, res: Response) => {
  res.send("APi  is running...");
});

// Centralized error handling middleware (must be last)
app.use(errorHandler);

export default app;