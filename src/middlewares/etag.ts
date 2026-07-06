import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";

/**
 * ETag middleware for GET requests.
 * Generates ETag from response body and supports If-None-Match for 304 responses.
 */
export const etagMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Only apply to GET requests
  if (req.method !== "GET") {
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

    // Set Cache-Control for cacheable GET responses
    if (!res.get("Cache-Control")) {
      res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=30");
    }

    return originalJson(body);
  } as any;

  next();
};
