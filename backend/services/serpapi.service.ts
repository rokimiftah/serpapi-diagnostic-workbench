import type { SerpApiParams, SerpApiResponse } from "../../shared/types/index.ts";

const SERPAPI_BASE_URL = "https://serpapi.com/search.json";

export interface SerpApiCallOptions {
  params: SerpApiParams;
  apiKey: string;
  timeout?: number;
}

export interface SerpApiCallResult {
  success: boolean;
  statusCode: number;
  latencyMs: number;
  response?: SerpApiResponse;
  error?: string;
}

export async function callSerpApi(options: SerpApiCallOptions): Promise<SerpApiCallResult> {
  const { params, apiKey, timeout = 15000 } = options;
  const startTime = performance.now();

  const searchParams = new URLSearchParams();
  searchParams.set("api_key", apiKey);

  for (const [key, value] of Object.entries(params)) {
    if (key !== "api_key" && value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }

  const url = `${SERPAPI_BASE_URL}?${searchParams.toString()}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        statusCode: response.status,
        latencyMs,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = (await response.json()) as SerpApiResponse;

    // SerpApi can return HTTP 200 with an error field (e.g., empty results, no transcript)
    // This is still a "successful" API call - just with no data
    // We should mark it as success and include the response for validation
    return {
      success: true,
      statusCode: response.status,
      latencyMs,
      response: data,
      error: data.error, // Include error message for informational purposes
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startTime);

    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        statusCode: 408,
        latencyMs,
        error: `Request timeout after ${timeout}ms`,
      };
    }

    return {
      success: false,
      statusCode: 0,
      latencyMs,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function getItemCount(response: SerpApiResponse): number | null {
  if (response.organic_results?.length) {
    return response.organic_results.length;
  }
  if (response.news_results?.length) {
    return response.news_results.length;
  }
  if (response.shopping_results?.length) {
    return response.shopping_results.length;
  }
  // YouTube Transcript API
  if (response.transcript?.length) {
    return response.transcript.length;
  }
  return null;
}

export function getRawHtmlUrl(response: SerpApiResponse): string | null {
  return response.search_metadata?.raw_html_file ?? null;
}
