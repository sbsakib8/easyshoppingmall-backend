import { Response, NextFunction } from "express";
import { AuthRequest } from "./isAuth";

export const isAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.userId || !req.user) {
      res.status(401).json({
        message: "Unauthorized: No authenticated user found",
        error: true,
        success: false,
      });
      return;
    }

    const userRole = req.user.role || "";
    const userRoles = req.user.roles || [];

    const isUserAdmin = userRole.toUpperCase() === "ADMIN" || 
                        userRoles.some((r: string) => r.toUpperCase() === "ADMIN");

    if (!isUserAdmin) {
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
