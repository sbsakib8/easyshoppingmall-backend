import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";

/**
 * ETag middleware for GET requests.
 * Generates ETag from response body and supports If-None-Match for 304 responses.
 * Skips ALL caching for authenticated requests (admin dashboard).
 */
export const etagMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Only apply to GET requests
  if (req.method !== "GET") {
    next();
    return;
  }

  // Skip ALL caching for authenticated requests (admin dashboard)
  if (req.cookies?.token) {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");
    next();
    return;
  }

  // Store the original json method
  const originalJson = res.json.bind(res);

  // Override json to add ETag support
  res.json = function (body: any) {
    // Generate ETag from response body
    const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
    const etag = `"${createHash("md5").update(bodyStr).digest("hex")}"`;

    // Set ETag header
    res.set("ETag", etag);

    // Check If-None-Match header
    const ifNoneMatch = req.headers["if-none-match"];
    if (ifNoneMatch && ifNoneMatch === etag) {
      res.status(304).end();
      return res;
    }

    // Set Cache-Control for non-auth GET responses
    // private = no CDN caching, no-cache = browser must revalidate with ETag every request
    if (!res.get("Cache-Control")) {
      res.set("Cache-Control", "private, no-cache");
    }

    return originalJson(body);
  } as any;

  next();
};
