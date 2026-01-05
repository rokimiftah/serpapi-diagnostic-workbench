import { config } from "./config/index.ts";
import app from "./index.ts";
import { log } from "./lib/logger.ts";

const server = Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

log.info(`Server started`);

// Graceful shutdown
const shutdown = () => {
  server.stop();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown());
process.on("SIGINT", () => shutdown());

if (config.isDev) {
  fetch("http://localhost:3000/__backend-reload").catch(() => {});
}
