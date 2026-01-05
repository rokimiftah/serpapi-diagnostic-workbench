import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";

import { config } from "../config/index.ts";
import { handleError } from "../lib/error-handler.ts";
import { logger, rateLimiter, securityHeaders } from "../middleware/index.ts";
import api from "./api.ts";

const app = new Hono();

app.use("*", logger);
app.use("*", securityHeaders);

app.use(
  "/api/*",
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);

app.use("/api/*", rateLimiter);

app.onError(handleError);

app.route("/api", api);

if (!config.isDev) {
  const staticRoot = "./dist/frontend";
  app.use("/*", serveStatic({ root: staticRoot }));
  app.get("*", (c) => c.html(Bun.file(`${staticRoot}/index.html`).text()));
}

export default app;
