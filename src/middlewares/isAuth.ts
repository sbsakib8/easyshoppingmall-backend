import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import processdata from "../config";

// Custom interface to extend Request
export interface AuthRequest extends Request {
  userId?: string;
}

export const isAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
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

    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};
