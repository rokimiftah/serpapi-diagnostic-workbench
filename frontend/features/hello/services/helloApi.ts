import { api } from "@/lib/api.ts";

export interface HelloResponse {
  message: string;
}

export const helloApi = {
  getMessage: () => api.get<HelloResponse>("/hello"),
};
