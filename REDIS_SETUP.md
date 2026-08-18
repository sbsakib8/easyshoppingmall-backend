# Redis Cache Setup (Vercel KV)

## Why This Is Needed

The backend uses Redis for server-side caching to achieve **sub-10ms response times** on Vercel serverless. Without Redis, each serverless invocation is a cold start with no cache, meaning every request hits MongoDB directly.

## Prerequisites

- Vercel account with access to the `easyshoppingmall` project
- Project already deployed on Vercel

---

## Step-by-Step Setup

### 1. Create a KV Store in Vercel

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select the **easyshoppingmall** project
3. Click the **Storage** tab in the top navigation bar
4. Click **Create Database**
5. Select **KV (Redis)** as the database type
6. Name it: `cache-store`
7. Click **Create**

### 2. Verify Environment Variables

When you create a KV store, Vercel **automatically** adds these two environment variables to your project:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

To verify:
1. Go to **Project Settings** (gear icon)
2. Click **Environment Variables** in the left sidebar
3. Search for `UPSTASH` — you should see both variables listed

> **Important:** Make sure the variables are available in **Production**, **Preview**, and **Development** environments. If not, click each variable and enable the required environments.

### 3. Redeploy the Project

After creating the KV store, the environment variables are available but the current deployment doesn't use them yet. You need to trigger a new deployment:

1. Go to the **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Click **Redeploy**
4. Select **Redeploy** (not "Redeploy with existing Build Cache")

Or simply push a new commit to trigger a fresh deployment.

### 4. (Optional) Set Up for Local Development

To test locally with Redis:

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel env pull .env.local`
3. This creates a `.env.local` file with all production env vars

Alternatively, manually add these to your `.env` file:

```
UPSTASH_REDIS_REST_URL=<copy from Vercel dashboard>
UPSTASH_REDIS_REST_TOKEN=<copy from Vercel dashboard>
```

> Without these env vars locally, the app still works — it falls back to in-memory caching (no persistence across restarts).

---

## What Gets Cached

| Endpoint | Cache TTL | Cache Key Pattern |
|----------|-----------|-------------------|
| Product listing | 60s | `products:{query}` |
| Product by category | 120s | `products:category:{id}` |
| Product by category+subcategory | 120s | `products:cat:{id}:sub:{id}:p{page}:l{limit}` |
| Product details | 300s | `product:{id}` |
| Categories list | 600s | `all_categories` |
| Category tree | 600s | `category_tree` |
| Subcategories | 300s | `subcategories:{filter}` |
| Home banners | 300s | `banners:home:{sliderFor}:{active}` |
| Center banners | 300s | `banners:center` |
| Left banners | 300s | `banners:left` |
| Right banners | 300s | `banners:right` |
| Active notices | 300s | `notices:active` |
| Website info | 60s | `websiteinfo` |
| Blogs | 300s | `blogs:all` |
| Homepage (all-in-one) | 60s | `homepage` |
| Auth user session | 300s | `auth:user:{userId}` |

## Cache Invalidation

Cache is automatically invalidated when data is modified:

| Action | Keys Invalidated |
|--------|-----------------|
| Product created/updated/deleted | `products:*`, `product:*`, `homepage` |
| Category created/updated/deleted | `all_categories`, `category_tree`, `subcategories:*`, `products:*`, `homepage` |
| SubCategory created/updated/deleted | `subcategories:*`, `all_categories`, `category_tree`, `products:*`, `homepage` |
| Home banner created/updated/deleted | `banners:home:*`, `homepage` |
| User profile updated | `auth:user:{userId}` |

---

## How It Works

```
Client Request
    ↓
Vercel Edge/Serverless Function
    ↓
Check Redis Cache (Upstash)
    ├── Cache HIT  → Return cached response (< 5ms)
    └── Cache MISS → Query MongoDB → Store in Redis → Return response
```

- **With Redis configured:** All reads go to Redis first. Cache hits return in < 5ms.
- **Without Redis configured:** Falls back to local in-memory cache. Works on local dev but cache is lost on each serverless cold start.

---

## Troubleshooting

### Cache not working / responses still slow

1. Verify env vars exist: **Project Settings → Environment Variables** → search `UPSTASH`
2. Check the deployment logs for Redis connection errors
3. Ensure the KV store is not paused (free tier has limits)

### How to flush cache manually

Use the Upstash Console:
1. Go to [https://console.upstash.com](https://console.upstash.com)
2. Select your Redis instance
3. Use the **CLI** tab to run: `FLUSHDB`

Or use the REST API:
```bash
curl -H "Authorization: Bearer <your-token>" <your-url>/flush
```

### Rate limits (Free tier)

Upstash free tier allows:
- **10,000 commands/day** (reads + writes combined)
- **100 requests/second** burst

If you exceed these, requests fall back to in-memory cache gracefully (no errors).

---

## Architecture Overview

```
easyshoppingmall-backend
├── src/
│   ├── utils/cache.ts              ← Redis + in-memory fallback
│   ├── config/index.ts             ← UPSTASH_REDIS_REST_URL/TOKEN
│   ├── middlewares/isAuth.ts       ← User lookup cached in Redis
│   ├── middlewares/etag.ts         ← 304 Not Modified support
│   ├── models/homepage/            ← Aggregated homepage endpoint
│   ├── models/product/             ← Cached product queries
│   ├── models/category/            ← Cached category queries
│   └── ...
└── package.json                    ← @upstash/redis dependency
```

## New Endpoint

A single aggregated homepage endpoint was added:

```
GET /api/homepage
```

Returns banners, categories, subcategories, featured products, website info, and notices in a single response. This replaces 4-5 separate API calls the frontend was making, reducing waterfall latency significantly.
