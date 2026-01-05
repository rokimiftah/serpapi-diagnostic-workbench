import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";

import api from "../../backend/routes/api.ts";

const app = new Hono();
app.route("/api", api);

export const onRequest = handle(app);
