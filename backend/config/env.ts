import { z } from "zod/v4";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  APP_URL: z.url().optional(),
  TURSO_DATABASE_URL: z.url(),
  TURSO_AUTH_TOKEN: z.string(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse({
    NODE_ENV: Bun.env.NODE_ENV,
    PORT: Bun.env.PORT,
    APP_URL: Bun.env.APP_URL,
    TURSO_DATABASE_URL: Bun.env.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: Bun.env.TURSO_AUTH_TOKEN,
  });

  if (!result.success) {
    console.error("Invalid environment variables:");
    console.error(z.prettifyError(result.error));
    throw new Error("Invalid environment variables");
  }

  return result.data;
}

export const env = validateEnv();
