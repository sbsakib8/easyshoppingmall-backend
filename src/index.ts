import express from "express"
import type { Application, Request, Response } from "express";
import connectDB from "./config/db.connect";
import userRoutes from "./models/user/user.routs";
import cookieParser from "cookie-parser";
// middleware
const app: Application = express();
app.use(express.json());
app.use(cookieParser());
// mongodb 
connectDB()

//  route
app.use("/api/users", userRoutes); 
app.get("/", (req: Request, res: Response) => {
  res.send("APi sarkar is running...");
});

export default app;