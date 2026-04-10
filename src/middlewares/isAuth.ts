import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import processdata from "../config";
import UserModel from "../models/user/user.model"; // Import UserModel
import { AuthUser } from "../models/order/interface"; // Import AuthUser interface

// Custom interface to extend Request
export interface AuthRequest extends Request {
  userId?: string;
  user?: AuthUser; // Add user property to AuthRequest
}

export const isAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { // Make function async
  try {
    const token = req.cookies?.token;
    if (!token) {
      res.status(401).json({ message: "Unauthorized: No token provided" });
      return;
    }

    const decoded = jwt.verify(token, processdata.jwtsecret) as JwtPayload & { userId?: string };

    if (!decoded?.userId) {
      res.status(401).json({ message: "Unauthorized: Invalid token" });
      return;
    }

    const user = await UserModel.findById(decoded.userId).maxTimeMS(5000); // 5s timeout
    if (!user) {
      res.status(401).json({ message: "Unauthorized: User not found" });
      return;
    }

    req.userId = decoded.userId;
    req.user = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role === "ADMIN" ? "admin" : "user",
      mobile: user.mobile || undefined,
    };
    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({ message: "Unauthorized: Token expired" });
    } else if (error.name === "JsonWebTokenError") {
      res.status(401).json({ message: "Unauthorized: Invalid token" });
    } else if (error.name === "MongooseError" || error.name === "MongoTimeoutError") {
      console.error("Database error in isAuth:", error.message);
      res.status(500).json({ message: "Internal Server Error: Database timeout" });
    } else {
      console.error("Auth error:", error.message);
      res.status(401).json({ message: "Unauthorized: Authentication failed" });
    }
  }
};
