// import type { ApiResponse } from "@shared/types/index.ts";

import { API_BASE_URL } from "./constants.ts";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(`${API_BASE_URL}${path}`),
  post: <T>(path: string, data: unknown) =>
    request<T>(`${API_BASE_URL}${path}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  put: <T>(path: string, data: unknown) =>
    request<T>(`${API_BASE_URL}${path}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: <T>(path: string) => request<T>(`${API_BASE_URL}${path}`, { method: "DELETE" }),
};
