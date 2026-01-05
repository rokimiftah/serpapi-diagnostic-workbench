import { env } from "./env.ts";

const devOrigins = ["http://localhost:3000", "http://localhost:3001"];
const prodOrigins = env.APP_URL ? [env.APP_URL] : [];

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  isDev: env.NODE_ENV !== "production",
  isTest: env.NODE_ENV === "test",
  isProd: env.NODE_ENV === "production",
  appUrl: env.APP_URL,
  corsOrigins: env.NODE_ENV === "production" ? prodOrigins : devOrigins,
  turso: {
    databaseUrl: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  },
} as const;

export { env };
