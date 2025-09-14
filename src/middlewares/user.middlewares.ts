import type { Request as ExpressRequest, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user/user.model";
import type { IUser } from "../models/user/user.model";
import processdata from "../config";

interface JwtPayload {
  id: string;
}

// Custom Request interface with user property
export interface AuthRequest extends ExpressRequest {
  user?: IUser | null;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get token from headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      res.status(401).json({ message: "Not authorized, no token" });
      return;
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, processdata.jwtsecret) as JwtPayload;

    // Attach user to request object
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      res.status(401).json({ message: "Not authorized, user not found" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};
