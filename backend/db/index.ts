import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { config } from "../config/index.ts";
import * as schema from "./schema.ts";

const client = createClient({
  url: config.turso.databaseUrl,
  authToken: config.turso.authToken,
});

export const db = drizzle(client, { schema });

export { schema };
