import { Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import processdata from "../config";
import UserModel from "../models/user/user.model";
import { AuthRequest } from "./isAuth";

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, processdata.jwtsecret) as JwtPayload & { userId?: string };

    if (!decoded?.userId) {
      return next();
    }

    const user = await UserModel.findById(decoded.userId).maxTimeMS(5000); // 5s timeout
    if (!user) {
      return next();
    }

    req.userId = decoded.userId;
    req.user = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role === "ADMIN" ? "admin" : "user",
      roles: user.roles || [user.role],
      mobile: user.mobile || undefined,
      balance: user.balance || 0,
    };
    next();
  } catch (error) {
    // Proceed without adding user details if token is invalid or expired
    next();
  }
};
