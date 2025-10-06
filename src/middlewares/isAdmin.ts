import { Response, NextFunction } from "express";
import UserModel, { IUser } from "../models/user/user.model";
import { AuthRequest } from "./isAuth";

export const isAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        message: "Unauthorized: No userId found",
        error: true,
        success: false,
      });
      return;
    }

    const user: IUser | null = await UserModel.findById(req.userId).select("role");

    if (!user) {
      res.status(404).json({
        message: "User not found",
        error: true,
        success: false,
      });
      return;
    }

    if (user.role !== "ADMIN") {
      res.status(403).json({
        message: "Permission denied: Admins only",
        error: true,
        success: false,
      });
      return;
    }

    next();
  } catch (err) {
    console.error("Admin middleware error:", err);
    res.status(500).json({
      message: "Internal server error in admin middleware",
      error: true,
      success: false,
    });
  }
};
