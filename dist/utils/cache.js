"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = void 0;
const redis_1 = require("@upstash/redis");
const config_1 = __importDefault(require("../config"));
const isRedisConfigured = config_1.default.upstashRedisUrl && config_1.default.upstashRedisToken;
let redis = null;
if (isRedisConfigured) {
    redis = new redis_1.Redis({
        url: config_1.default.upstashRedisUrl,
        token: config_1.default.upstashRedisToken,
    });
}
// In-memory fallback for local dev / when Redis is not configured
const memCache = new Map();
function memGet(key) {
    const entry = memCache.get(key);
    if (!entry)
        return null;
    if (Date.now() > entry.expiry) {
        memCache.delete(key);
        return null;
    }
    return entry.data;
}
function memSet(key, data, ttlSeconds) {
    memCache.set(key, { data, expiry: Date.now() + ttlSeconds * 1000 });
}
async function memDeleteByPrefix(prefix) {
    for (const key of memCache.keys()) {
        if (key.startsWith(prefix)) {
            memCache.delete(key);
        }
    }
}
class RedisCache {
    async get(key) {
        try {
            const data = await redis.get(key);
            return data ?? null;
        }
        catch {
            return null;
        }
    }
    async set(key, data, ttlSeconds = 300) {
        try {
            await redis.set(key, data, { ex: ttlSeconds });
        }
        catch {
            // Silent fail - cache is non-critical
        }
    }
    async del(key) {
        try {
            await redis.del(key);
        }
        catch {
            // Silent fail
        }
    }
    async delByPrefix(prefix) {
        try {
            // Upstash/Redis: use SCAN to find keys matching prefix
            let cursor = 0;
            const keysToDelete = [];
            do {
                const result = await redis.scan(cursor, { match: `${prefix}*`, count: 100 });
                cursor = result[0];
                keysToDelete.push(...result[1]);
            } while (cursor !== 0 && cursor !== "0");
            if (keysToDelete.length > 0) {
                // Delete in batches of 50
                for (let i = 0; i < keysToDelete.length; i += 50) {
                    const batch = keysToDelete.slice(i, i + 50);
                    await redis.del(...batch);
                }
            }
        }
        catch {
            // Silent fail
        }
    }
    async has(key) {
        try {
            const exists = await redis.exists(key);
            return exists === 1;
        }
        catch {
            return false;
        }
    }
}
class InMemoryCache {
    async get(key) {
        return memGet(key);
    }
    async set(key, data, ttlSeconds = 300) {
        memSet(key, data, ttlSeconds);
    }
    async del(key) {
        memCache.delete(key);
    }
    async delByPrefix(prefix) {
        await memDeleteByPrefix(prefix);
    }
    async has(key) {
        const entry = memCache.get(key);
        if (!entry)
            return false;
        if (Date.now() > entry.expiry) {
            memCache.delete(key);
            return false;
        }
        return true;
    }
}
// Export the appropriate cache implementation
exports.cache = redis ? new RedisCache() : new InMemoryCache();
