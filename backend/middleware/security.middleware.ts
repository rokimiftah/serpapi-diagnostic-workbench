import type { Context, Next } from "hono";

import { config } from "../config/index.ts";

export const securityHeaders = async (c: Context, next: Next) => {
  await next();

  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set("X-XSS-Protection", "0");
  c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  c.res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (config.isProd) {
    c.res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
};
