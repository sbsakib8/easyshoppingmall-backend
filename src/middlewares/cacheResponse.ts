import { Request, Response, NextFunction } from "express";
import { cache } from "../utils/cache";

export const cacheResponse = (ttlSeconds: number = 300) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (req.method !== "GET") {
            next();
            return;
        }

        const cacheKey = req.originalUrl;

        try {
            const cachedData = await cache.get(cacheKey);
            if (cachedData) {
                res.status(200).json(cachedData);
                return;
            }
        } catch (err) {
            console.error("[CACHE] Read error:", err);
        }

        const originalJson = res.json.bind(res);

        res.json = function (body: any) {
            cache.set(cacheKey, body, ttlSeconds).catch((err) => {
                console.error("[CACHE] Write error:", err);
            });

            return originalJson(body);
        } as any;

        next();
    };
};

export const invalidateCache = async (prefix: string): Promise<void> => {
    try {
        await cache.delByPrefix(prefix);
    } catch (err) {
        console.error("[CACHE] Invalidation error:", err);
    }
};
