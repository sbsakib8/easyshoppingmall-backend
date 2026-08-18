import { Response, NextFunction } from "express";
import { AuthRequest } from "./isAuth";

/**
 * Dashboard access permissions by role:
 * - ADMIN: full access to everything
 * - MANAGER: products, orders, customers, dropshipping (manage video), banner, content
 * - CPO: products, orders, coupons
 */
const DASHBOARD_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    "products",
    "orders",
    "customers",
    "dropshipping",
    "banner",
    "content",
    "coupons",
    "notifications",
    "analytics",
    "users",
    "settings",
  ],
  MANAGER: [
    "products",
    "orders",
    "customers",
    "dropshipping",
    "banner",
    "content",
  ],
  CPO: [
    "products",
    "orders",
    "coupons",
  ],
};

/**
 * Middleware factory: returns middleware that checks if the user's role
 * grants access to the specified dashboard section.
 *
 * Usage: isDashboardAccess("products") or isDashboardAccess("orders")
 */
export const isDashboardAccess = (section: string) => {
  return async (
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

      // Check if user is ADMIN (full access)
      const isUserAdmin =
        userRole.toUpperCase() === "ADMIN" ||
        userRoles.some((r: string) => r.toUpperCase() === "ADMIN");

      if (isUserAdmin) {
        next();
        return;
      }

      // Check MANAGER permissions
      const isManager =
        userRole === "MANAGER" || userRoles.includes("MANAGER");
      if (isManager) {
        const managerSections = DASHBOARD_PERMISSIONS["MANAGER"];
        if (managerSections.includes(section)) {
          next();
          return;
        }
      }

      // Check CPO permissions
      const isCPO = userRole === "CPO" || userRoles.includes("CPO");
      if (isCPO) {
        const cpoSections = DASHBOARD_PERMISSIONS["CPO"];
        if (cpoSections.includes(section)) {
          next();
          return;
        }
      }

      // No matching permission found
      res.status(403).json({
        message: `Permission denied: Your role does not have access to ${section}`,
        error: true,
        success: false,
      });
    } catch (err) {
      console.error("Dashboard access middleware error:", err);
      res.status(500).json({
        message: "Internal server error in dashboard access middleware",
        error: true,
        success: false,
      });
    }
  };
};

/**
 * Middleware: checks if user has dashboard access (any section).
 * Useful for protecting general dashboard endpoints.
 */
export const isDashboardUser = async (
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

    const dashboardRoles = ["ADMIN", "MANAGER", "CPO"];
    const hasAccess =
      dashboardRoles.includes(userRole) ||
      userRoles.some((r: string) => dashboardRoles.includes(r));

    if (!hasAccess) {
      res.status(403).json({
        message: "Permission denied: No dashboard access",
        error: true,
        success: false,
      });
      return;
    }

    next();
  } catch (err) {
    console.error("Dashboard user middleware error:", err);
    res.status(500).json({
      message: "Internal server error in dashboard user middleware",
      error: true,
      success: false,
    });
  }
};
