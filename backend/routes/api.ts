import { Hono } from "hono";

import diagnosticsRouter from "./diagnostics.routes.ts";
import healthRouter from "./health.routes.ts";
import helloRouter from "./hello.routes.ts";
import monitoringRouter from "./monitoring.routes.ts";

// API v1 routes
const v1 = new Hono()
  .route("/", helloRouter)
  .route("/diagnostics", diagnosticsRouter)
  .route("/monitoring", monitoringRouter);

// Main API router
const api = new Hono()
  .route("/", healthRouter) // Health check at /api/health (unversioned)
  .route("/v1", v1); // Versioned routes at /api/v1/*

export type ApiType = typeof api;
export type ApiV1Type = typeof v1;

export default api;
