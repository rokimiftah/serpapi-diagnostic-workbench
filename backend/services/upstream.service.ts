import type { BlockPattern, UpstreamReport } from "../../shared/types/index.ts";

import * as cheerio from "cheerio";

const BLOCK_PATTERNS = [
  { pattern: "captcha", label: "CAPTCHA detected" },
  { pattern: "unusual traffic", label: "Unusual traffic warning" },
  { pattern: "precondition check failed", label: "Precondition check failed" },
  { pattern: "are you a robot", label: "Robot check" },
  { pattern: "i'm not a robot", label: "Robot verification" },
  { pattern: "blocked", label: "Blocked message" },
  { pattern: "access denied", label: "Access denied" },
  { pattern: "please verify you are human", label: "Human verification required" },
  { pattern: "rate limit", label: "Rate limited" },
];

export async function analyzeUpstream(rawHtmlUrl: string): Promise<UpstreamReport> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(rawHtmlUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        rawHtmlUrl,
        contentType: "unknown",
        isBlocked: true,
        blockPatterns: [],
        htmlSize: 0,
        status: "UPSTREAM_BLOCK",
        alertMessage: `Failed to fetch raw HTML: HTTP ${response.status}`,
      };
    }

    const content = await response.text();
    const htmlSize = content.length;
    const contentType = detectContentType(content);

    if (contentType === "json") {
      // Check if the JSON contains an error - not all JSON responses are errors
      try {
        const jsonData = JSON.parse(content);
        // Check for error indicators in JSON response
        if (jsonData.error || jsonData.status === "Error" || jsonData.status === "FAILED_PRECONDITION") {
          const errorMsg =
            typeof jsonData.error === "string"
              ? jsonData.error
              : typeof jsonData.message === "string"
                ? jsonData.message
                : JSON.stringify(jsonData.error || jsonData.message || "Unknown error");

          // All JSON errors indicate upstream issues - treat as UPSTREAM_BLOCK
          return {
            rawHtmlUrl,
            contentType: "json",
            isBlocked: true,
            blockPatterns: [],
            htmlSize,
            status: "UPSTREAM_BLOCK",
            alertMessage: `JSON error response: ${errorMsg}`,
          };
        }
        // JSON response without error - this is normal for some APIs
        return {
          rawHtmlUrl,
          contentType: "json",
          isBlocked: false,
          blockPatterns: [],
          htmlSize,
          status: "STABLE",
          alertMessage: undefined,
        };
      } catch {
        // Invalid JSON - treat as suspicious
        return {
          rawHtmlUrl,
          contentType: "json",
          isBlocked: true,
          blockPatterns: [],
          htmlSize,
          status: "UPSTREAM_BLOCK",
          alertMessage: "Invalid JSON response detected",
        };
      }
    }

    const blockPatterns = scanForBlockPatterns(content);
    const isBlocked = blockPatterns.some((p) => p.found);

    return {
      rawHtmlUrl,
      contentType,
      isBlocked,
      blockPatterns,
      htmlSize,
      status: isBlocked ? "UPSTREAM_BLOCK" : "STABLE",
      alertMessage: isBlocked
        ? `Blocking patterns detected: ${blockPatterns
            .filter((p) => p.found)
            .map((p) => p.pattern)
            .join(", ")}`
        : undefined,
    };
  } catch (error) {
    return {
      rawHtmlUrl,
      contentType: "unknown",
      isBlocked: true,
      blockPatterns: [],
      htmlSize: 0,
      status: "UPSTREAM_BLOCK",
      alertMessage: `Error fetching raw HTML: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

function detectContentType(content: string): "html" | "json" | "unknown" {
  const trimmed = content.trim();

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      // Not valid JSON
    }
  }

  if (trimmed.toLowerCase().startsWith("<!doctype") || trimmed.toLowerCase().startsWith("<html")) {
    return "html";
  }

  if (trimmed.includes("<html") || trimmed.includes("<body") || trimmed.includes("<head")) {
    return "html";
  }

  return "unknown";
}

function scanForBlockPatterns(content: string): BlockPattern[] {
  const $ = cheerio.load(content);

  // Remove script and style tags to avoid false positives
  $("script").remove();
  $("style").remove();
  $("noscript").remove();

  // Get only visible text content
  const visibleText = $("body").text().toLowerCase();

  // Also check title and meta description for block indicators
  const title = $("title").text().toLowerCase();
  const metaDesc = $('meta[name="description"]').attr("content")?.toLowerCase() || "";

  // Combined text to check (visible content + title + meta)
  const textToCheck = `${title} ${metaDesc} ${visibleText}`;

  return BLOCK_PATTERNS.map(({ pattern, label }) => {
    // Only check in visible text, not raw HTML (to avoid script/metadata false positives)
    const found = textToCheck.includes(pattern);

    let context: string | undefined;
    if (found) {
      const index = textToCheck.indexOf(pattern);
      if (index !== -1) {
        const start = Math.max(0, index - 30);
        const end = Math.min(textToCheck.length, index + pattern.length + 30);
        context = textToCheck.slice(start, end).replace(/\s+/g, " ").trim();
      }
    }

    return {
      pattern: label,
      found,
      context,
    };
  });
}

export function extractRawHtmlUrl(response: Record<string, unknown>): string | null {
  const metadata = response.search_metadata as Record<string, unknown> | undefined;
  return (metadata?.raw_html_file as string) ?? null;
}
