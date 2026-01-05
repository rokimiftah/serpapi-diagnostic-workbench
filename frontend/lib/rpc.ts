import type { ApiType, ApiV1Type } from "../../backend/routes/api.ts";

import { hc } from "hono/client";

const getBaseUrl = () => {
  if (typeof window === "undefined") return "";
  return window.location.hostname === "localhost" ? "http://localhost:3001" : "";
};

// Full API client (includes health check and versioned routes)
export const api = hc<ApiType>(`${getBaseUrl()}/api`);

// V1 API client (recommended for app usage)
export const client = hc<ApiV1Type>(`${getBaseUrl()}/api/v1`);

export type { ApiType, ApiV1Type };
