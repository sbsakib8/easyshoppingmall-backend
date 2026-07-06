import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import processdata from "../config";
import UserModel from "../models/user/user.model";
import { AuthUser } from "../models/order/interface";
import { cache } from "../utils/cache";

export interface AuthRequest extends Request {
  userId?: string;
  user?: AuthUser;
}

const USER_CACHE_TTL = 300; // 5 minutes

export const isAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

    // Try cache first
    const cacheKey = `auth:user:${decoded.userId}`;
    const cachedUser = await cache.get<AuthUser>(cacheKey);

    if (cachedUser) {
      req.userId = decoded.userId;
      req.user = cachedUser;
      next();
      return;
    }

    // Cache miss - fetch from DB
    const user = await UserModel.findById(decoded.userId).maxTimeMS(2000);
    if (!user) {
      res.status(401).json({ message: "Unauthorized: User not found" });
      return;
    }

    const authUser: AuthUser = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role?.toLowerCase() || "user",
      roles: user.roles || [user.role],
      mobile: user.mobile || undefined,
      balance: user.balance || 0,
    };

    // Cache user data
    await cache.set(cacheKey, authUser, USER_CACHE_TTL);

    req.userId = decoded.userId;
    req.user = authUser;
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

// Invalidate user cache (call on profile update, role change, etc.)
export const invalidateUserCache = async (userId: string): Promise<void> => {
  await cache.del(`auth:user:${userId}`);
};
