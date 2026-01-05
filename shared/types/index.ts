export interface User {
  id: number;
  name: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export * from "./diagnostic.types.ts";
export * from "./serpapi.types.ts";
