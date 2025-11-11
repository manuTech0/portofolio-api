import { LRUCache } from "lru-cache";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitCache = new LRUCache<string, RateLimitEntry>({
  max: 500, // Maximum number of IPs to track
  ttl: 1000 * 60 * 60, // 1 hour TTL
});

export function checkRateLimit(ip: string, limit: number = 3, windowMs: number = 20 * 60 * 1000): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const entry = rateLimitCache.get(ip);
  if (!entry || now > entry.resetTime) {
    // New entry or expired window
    const resetTime = now + windowMs;
    rateLimitCache.set(ip, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  }

  if (entry.count >= limit) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  // Increment count
  entry.count++;
  rateLimitCache.set(ip, entry);
  return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime };
}