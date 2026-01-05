import type { Context, Next } from "hono";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const requests = new Map<string, RateLimitRecord>();

// Cleanup expired records every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, record] of requests) {
      if (now > record.resetTime) {
        requests.delete(ip);
      }
    }
  },
  5 * 60 * 1000
);

export const createRateLimiter = (config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }) => {
  return async (c: Context, next: Next) => {
    const forwarded = c.req.header("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
    const now = Date.now();
    const record = requests.get(ip);

    if (!record || now > record.resetTime) {
      requests.set(ip, { count: 1, resetTime: now + config.windowMs });
    } else if (record.count >= config.maxRequests) {
      c.res.headers.set("Retry-After", String(Math.ceil((record.resetTime - now) / 1000)));
      return c.json({ success: false, error: "Too many requests" }, 429);
    } else {
      record.count++;
    }

    await next();
  };
};

export const rateLimiter = createRateLimiter();
