import type { Context, Next } from "hono";

import { log } from "../lib/logger.ts";

export const logger = async (c: Context, next: Next) => {
  const start = Date.now();

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  log.http(c.req.method, c.req.path, status, duration);
};
