import { Hono } from "hono";

import { db } from "../db/index.ts";

const healthRouter = new Hono().get("/health", async (c) => {
  const startTime = Date.now();

  // Check database connection
  let dbStatus = "ok";
  let dbLatency = 0;
  try {
    const dbStart = Date.now();
    await db.run("SELECT 1");
    dbLatency = Date.now() - dbStart;
  } catch {
    dbStatus = "error";
  }

  const status = dbStatus === "ok" ? "healthy" : "unhealthy";
  const statusCode = status === "healthy" ? 200 : 503;

  return c.json(
    {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      latency: {
        total: Date.now() - startTime,
        database: dbLatency,
      },
      checks: {
        database: dbStatus,
      },
    },
    statusCode
  );
});

export default healthRouter;
