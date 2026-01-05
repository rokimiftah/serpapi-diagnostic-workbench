// Deep Analysis Service - HTML vs JSON Comparison
// Compares raw HTML from source with SerpApi JSON response
// to detect missing/unparsed data (parsing bugs)

// Selectors for different engines to find content in HTML
const ENGINE_HTML_SELECTORS: Record<string, Record<string, { selector: string; description: string }>> = {
  google: {
    organic_results: { selector: "div.g, div.MjjYud", description: "Organic search results" },
    local_results: { selector: "div.VkpGBb, div[data-attrid*='local']", description: "Local pack results" },
    knowledge_graph: { selector: "div.kp-wholepage, div.knowledge-panel, div.kp-header", description: "Knowledge panel" },
    shopping_results: { selector: "div.commercial-unit-desktop-top, div.pla-unit", description: "Shopping ads" },
    related_questions: { selector: "div.related-question-pair, div[data-sgrd]", description: "People also ask" },
    top_stories: { selector: "g-card, div[data-hveid] article", description: "Top stories" },
    inline_images: { selector: "div.islrc img, g-img.ivg-i", description: "Image results" },
    inline_videos: { selector: "video-voyager, div[data-ved] a[href*='youtube.com']", description: "Video results" },
  },
  google_shopping: {
    shopping_results: { selector: "div.sh-dgr__gr-auto, div.sh-dlr__list-result, div.KZmu8e", description: "Products" },
    filters: { selector: "div.eFNjkd, div[data-filter]", description: "Filters" },
  },
  google_news: {
    news_results: { selector: "article, div[data-n-tid], c-wiz article, div.xrnccd", description: "News articles" },
  },
  ebay: {
    organic_results: { selector: "li.s-item, div.s-item__wrapper", description: "Product listings" },
  },
  naver: {
    web_results: { selector: "li.bx, div.total_wrap, ul.lst_total > li", description: "Web results" },
    news_results: { selector: "div.news_wrap, ul.list_news > li", description: "News results" },
    ads_results: { selector: "div.ad_area, li.sp_keyword", description: "Ads" },
  },
};

// JSON sections to check for each engine
const ENGINE_JSON_SECTIONS: Record<string, string[]> = {
  google: [
    "organic_results",
    "local_results",
    "knowledge_graph",
    "shopping_results",
    "related_questions",
    "top_stories",
    "inline_images",
    "inline_videos",
  ],
  google_shopping: ["shopping_results", "filters"],
  google_news: ["news_results"],
  youtube_video_transcript: ["transcript"],
  ebay: ["organic_results"],
  naver: ["web_results", "news_results", "ads_results"],
};

export interface HtmlSection {
  name: string;
  count: number;
  selector: string;
}

export interface MissingSection {
  section: string;
  description: string;
  severity: "critical" | "warning" | "info";
  htmlEvidence: string;
  htmlCount: number;
}

export interface DeepAnalysisReport {
  engine: string;
  timestamp: string;

  // HTML Comparison (the important part)
  htmlComparison: {
    htmlFetched: boolean;
    htmlUrl?: string;
    htmlSize?: number;
    sectionsInHtml: HtmlSection[];
    sectionsInJson: string[];
    missingInJson: MissingSection[];
    summary: string;
  };

  // Quick stats
  totalSectionsInHtml: number;
  totalSectionsInJson: number;
  totalMissing: number;
  criticalMissing: number;

  // Overall assessment
  hasCriticalIssues: boolean;
  suggestedTicketTitle?: string;
}

function determineSeverity(sectionName: string, count: number): "critical" | "warning" | "info" {
  // Critical sections - main content that should always be parsed
  const criticalSections = ["organic_results", "shopping_results", "news_results", "web_results"];
  if (criticalSections.includes(sectionName) && count > 0) {
    return "critical";
  }

  // Warning sections - important but not critical
  const warningSections = ["local_results", "knowledge_graph", "related_questions"];
  if (warningSections.includes(sectionName) && count > 0) {
    return "warning";
  }

  return "info";
}

function getJsonSections(engine: string, response: Record<string, unknown>): string[] {
  const sections = ENGINE_JSON_SECTIONS[engine] || [];
  const present: string[] = [];

  for (const section of sections) {
    const data = response[section];
    if (data !== undefined) {
      if (Array.isArray(data) && data.length > 0) {
        present.push(section);
      } else if (typeof data === "object" && data !== null && !Array.isArray(data)) {
        present.push(section);
      }
    }
  }

  return present;
}

/**
 * Main function: Compare HTML from source with JSON response from SerpApi
 */
export async function performDeepAnalysis(engine: string, response: Record<string, unknown>): Promise<DeepAnalysisReport> {
  const timestamp = new Date().toISOString();

  // Get raw HTML URL from response
  const searchMetadata = response.search_metadata as Record<string, unknown> | undefined;
  const rawHtmlUrl = searchMetadata?.raw_html_file as string | undefined;

  // Get sections present in JSON
  const sectionsInJson = getJsonSections(engine, response);

  // Initialize report
  const report: DeepAnalysisReport = {
    engine,
    timestamp,
    htmlComparison: {
      htmlFetched: false,
      htmlUrl: rawHtmlUrl,
      sectionsInHtml: [],
      sectionsInJson,
      missingInJson: [],
      summary: "",
    },
    totalSectionsInHtml: 0,
    totalSectionsInJson: sectionsInJson.length,
    totalMissing: 0,
    criticalMissing: 0,
    hasCriticalIssues: false,
  };

  if (!rawHtmlUrl) {
    report.htmlComparison.summary = "No raw HTML URL available in response";
    return report;
  }

  // Wrap entire operation in timeout
  const timeoutPromise = new Promise<DeepAnalysisReport>((resolve) => {
    setTimeout(() => {
      report.htmlComparison.summary = "Deep analysis timed out";
      resolve(report);
    }, 10000);
  });

  const analysisPromise = performHtmlComparison(engine, rawHtmlUrl, sectionsInJson, report);

  return Promise.race([analysisPromise, timeoutPromise]);
}

async function performHtmlComparison(
  engine: string,
  rawHtmlUrl: string,
  sectionsInJson: string[],
  report: DeepAnalysisReport
): Promise<DeepAnalysisReport> {
  try {
    // Fetch raw HTML with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const htmlResponse = await fetch(rawHtmlUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "SerpApi-Diagnostic-Workbench/1.0" },
    });

    clearTimeout(timeoutId);

    if (!htmlResponse.ok) {
      report.htmlComparison.summary = `Failed to fetch HTML: ${htmlResponse.status}`;
      return report;
    }

    let html = await htmlResponse.text();
    report.htmlComparison.htmlFetched = true;
    report.htmlComparison.htmlSize = html.length;

    // Limit HTML size to prevent hang (max 1MB)
    const MAX_HTML_SIZE = 1024 * 1024;
    if (html.length > MAX_HTML_SIZE) {
      html = html.substring(0, MAX_HTML_SIZE);
    }

    // Parse HTML using cheerio (faster than jsdom)
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);

    // Find sections in HTML
    const selectors = ENGINE_HTML_SELECTORS[engine] || {};
    for (const [sectionName, config] of Object.entries(selectors)) {
      const elements = $(config.selector);
      if (elements.length > 0) {
        report.htmlComparison.sectionsInHtml.push({
          name: sectionName,
          count: elements.length,
          selector: config.selector,
        });
      }
    }

    report.totalSectionsInHtml = report.htmlComparison.sectionsInHtml.length;

    // Compare: Find sections in HTML but NOT in JSON (PARSING BUG!)
    for (const htmlSection of report.htmlComparison.sectionsInHtml) {
      const inJson = sectionsInJson.includes(htmlSection.name);
      if (!inJson) {
        const config = selectors[htmlSection.name];
        const severity = determineSeverity(htmlSection.name, htmlSection.count);

        report.htmlComparison.missingInJson.push({
          section: htmlSection.name,
          description: `Found ${htmlSection.count} "${config?.description || htmlSection.name}" in HTML but NOT parsed in JSON`,
          severity,
          htmlEvidence: `Selector: ${htmlSection.selector}`,
          htmlCount: htmlSection.count,
        });

        if (severity === "critical") {
          report.criticalMissing++;
        }
      }
    }

    report.totalMissing = report.htmlComparison.missingInJson.length;
    report.hasCriticalIssues = report.criticalMissing > 0;

    // Generate summary
    if (report.totalMissing === 0) {
      report.htmlComparison.summary = "All HTML sections are present in JSON response. No parsing issues detected.";
    } else {
      report.htmlComparison.summary = `PARSING ISSUE: Found ${report.totalMissing} section(s) in HTML that are NOT in JSON response.`;
      if (report.criticalMissing > 0) {
        report.htmlComparison.summary += ` CRITICAL: ${report.criticalMissing} major section(s) missing!`;
      }
    }

    // Generate suggested ticket title if critical issues
    if (report.hasCriticalIssues) {
      const firstCritical = report.htmlComparison.missingInJson.find((m) => m.severity === "critical");
      if (firstCritical) {
        const engineName = engine.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        report.suggestedTicketTitle = `[${engineName}] Missing ${firstCritical.section} - found ${firstCritical.htmlCount} in HTML but not parsed`;
      }
    }

    return report;
  } catch (error) {
    report.htmlComparison.summary =
      error instanceof Error && error.name === "AbortError"
        ? "HTML fetch timed out"
        : `Error: ${error instanceof Error ? error.message : "Unknown"}`;
    return report;
  }
}

// Keep the sync version for backward compatibility (without HTML comparison)
export function performDeepAnalysisSync(engine: string, response: Record<string, unknown>): DeepAnalysisReport {
  const sectionsInJson = getJsonSections(engine, response);
  const searchMetadata = response.search_metadata as Record<string, unknown> | undefined;
  const rawHtmlUrl = searchMetadata?.raw_html_file as string | undefined;

  return {
    engine,
    timestamp: new Date().toISOString(),
    htmlComparison: {
      htmlFetched: false,
      htmlUrl: rawHtmlUrl,
      sectionsInHtml: [],
      sectionsInJson,
      missingInJson: [],
      summary: "HTML comparison not performed (sync mode)",
    },
    totalSectionsInHtml: 0,
    totalSectionsInJson: sectionsInJson.length,
    totalMissing: 0,
    criticalMissing: 0,
    hasCriticalIssues: false,
  };
}
