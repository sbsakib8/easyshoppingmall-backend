import { Redis } from "@upstash/redis";
import processdata from "../config";

const isRedisConfigured = processdata.upstashRedisUrl && processdata.upstashRedisToken;

let redis: Redis | null = null;
if (isRedisConfigured) {
  redis = new Redis({
    url: processdata.upstashRedisUrl,
    token: processdata.upstashRedisToken,
  });
}

// In-memory fallback for local dev / when Redis is not configured
const memCache = new Map<string, { data: any; expiry: number }>();

function memGet<T>(key: string): T | null {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    memCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function memSet(key: string, data: any, ttlSeconds: number): void {
  memCache.set(key, { data, expiry: Date.now() + ttlSeconds * 1000 });
}

async function memDeleteByPrefix(prefix: string): Promise<void> {
  for (const key of memCache.keys()) {
    if (key.startsWith(prefix)) {
      memCache.delete(key);
    }
  }
}

export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set(key: string, data: any, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  delByPrefix(prefix: string): Promise<void>;
  has(key: string): Promise<boolean>;
}

class RedisCache implements CacheStore {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis!.get<T>(key);
      return data ?? null;
    } catch {
      return null;
    }
  }

  async set(key: string, data: any, ttlSeconds: number = 300): Promise<void> {
    try {
      await redis!.set(key, data, { ex: ttlSeconds });
    } catch {
      // Silent fail - cache is non-critical
    }
  }

  async del(key: string): Promise<void> {
    try {
      await redis!.del(key);
    } catch {
      // Silent fail
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    try {
      // Upstash/Redis: use SCAN to find keys matching prefix
      let cursor: string | number = 0;
      const keysToDelete: string[] = [];
      do {
        const result: [string | number, string[]] = await redis!.scan(cursor, { match: `${prefix}*`, count: 100 });
        cursor = result[0];
        keysToDelete.push(...result[1]);
      } while (cursor !== 0 && cursor !== "0");

      if (keysToDelete.length > 0) {
        // Delete in batches of 50
        for (let i = 0; i < keysToDelete.length; i += 50) {
          const batch = keysToDelete.slice(i, i + 50);
          await redis!.del(...batch);
        }
      }
    } catch {
      // Silent fail
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const exists = await redis!.exists(key);
      return exists === 1;
    } catch {
      return false;
    }
  }
}

class InMemoryCache implements CacheStore {
  async get<T>(key: string): Promise<T | null> {
    return memGet<T>(key);
  }

  async set(key: string, data: any, ttlSeconds: number = 300): Promise<void> {
    memSet(key, data, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    memCache.delete(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    await memDeleteByPrefix(prefix);
  }

  async has(key: string): Promise<boolean> {
    const entry = memCache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiry) {
      memCache.delete(key);
      return false;
    }
    return true;
  }
}

// Export the appropriate cache implementation
export const cache: CacheStore = redis ? new RedisCache() : new InMemoryCache();
