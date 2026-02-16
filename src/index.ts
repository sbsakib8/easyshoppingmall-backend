import cookieParser from "cookie-parser";
import cors from "cors";
import type { Application, Request, Response } from "express";
import express from "express";

import addressRouter from "./models/address/address.routs";
import centerBannerRoutes from "./models/banners/centerBanner/centerBanner.routs";
import homeBannerRoutes from "./models/banners/homeBanner/homeBanner.routs";
import leftBannerRoutes from "./models/banners/leftBanner/leftBanner.routs";
import RightBannerRoutes from "./models/banners/rightBanner/rightBanner.routs";
import cartRouter from './models/cart/cart.routs';
import categoryRoutes from "./models/category/category.routs";
import blogRoutes from "./models/content/blogs/blogs.routs";
import contactRoutes from "./models/content/contact/contact.routs";
import websiteInfo from "./models/content/websiteInfo/websiteinfo.routs";
import notifications from "./models/notification/notification.routs";
import orderRoute from './models/order/order.routs';
import paymentRouter from './models/payment/payment.route';

import adminRoutes from './models/admin/admin.route';
import productRouter from "./models/product/product.routs";
import reviewRouter from './models/review/review.routs';
import subcategoriesRoutes from "./models/subcategory/subcategory.routs";
import userRoutes from "./models/user/user.routs";
import wishlistRouter from './models/wishlist/wishlist.routs';
import errorHandler from "./middlewares/errorHandler"; // Import the error handler

// middleware
const app: Application = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// cors
app.use(cors(
  {
    origin: ["http://localhost:3000",
      "https://easyshoppingmallbd.com",
      "https://easyshoppingmallbd.vercel.app"],
    credentials: true,
  }
));


//  route
import analyticsRoutes from "./models/analytics/analytics.routs";

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

app.use("/api/analytics", analyticsRoutes);

app.use("/api/admin", adminRoutes)


app.get("/", (req: Request, res: Response) => {
  res.send("APi  is running...");
});
// hhs
// Centralized error handling middleware (must be last)
app.use(errorHandler);

export default app;