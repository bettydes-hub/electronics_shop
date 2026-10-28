import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const buckets = new Map<string, number[]>();
const upstashLimiters = new Map<string, Ratelimit>();
let upstashRedis: Redis | null | undefined;

function pruneAndCount(timestamps: number[], now: number, windowMs: number): number[] {
  return timestamps.filter((t) => now - t < windowMs);
}

export function clientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (fwd) return fwd;
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

function getRedis(): Redis | null {
  if (upstashRedis !== undefined) return upstashRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    upstashRedis = null;
    return upstashRedis;
  }
  upstashRedis = new Redis({ url, token });
  return upstashRedis;
}

function getLimiter(bucketKey: string, limit: number, windowMs: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const sec = Math.max(1, Math.ceil(windowMs / 1000));
  const cacheKey = `${bucketKey}:${limit}:${sec}`;
  const existing = upstashLimiters.get(cacheKey);
  if (existing) return existing;
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${sec} s`),
    analytics: true,
    prefix: "rl",
  });
  upstashLimiters.set(cacheKey, limiter);
  return limiter;
}

/**
 * Fixed-window style limiter (per-process). Good enough for dev / single instance;
 * use a shared store (e.g. Redis) in multi-node production if needed.
 */
function inMemoryRateLimitExceeded(
  request: NextRequest,
  bucketKey: string,
  limit: number,
  windowMs: number
): boolean {
  const key = `${bucketKey}:${clientIp(request)}`;
  const now = Date.now();
  const prev = buckets.get(key) ?? [];
  const windowed = pruneAndCount(prev, now, windowMs);
  if (windowed.length >= limit) {
    buckets.set(key, windowed);
    return true;
  }
  windowed.push(now);
  buckets.set(key, windowed);
  return false;
}

/**
 * Uses Upstash Redis when configured; falls back to in-memory limiter.
 */
export async function rateLimitExceeded(
  request: NextRequest,
  bucketKey: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const key = `${bucketKey}:${clientIp(request)}`;
  const limiter = getLimiter(bucketKey, limit, windowMs);
  if (!limiter) return inMemoryRateLimitExceeded(request, bucketKey, limit, windowMs);
  try {
    const res = await limiter.limit(key);
    return !res.success;
  } catch {
    return inMemoryRateLimitExceeded(request, bucketKey, limit, windowMs);
  }
}
