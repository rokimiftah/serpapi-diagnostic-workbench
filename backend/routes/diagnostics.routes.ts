import type { DiagnosticStatus, DiagnosticSummary } from "../../shared/types/index.ts";

import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { performDeepAnalysis } from "../services/deep-analysis.service.ts";
import { callSerpApi } from "../services/serpapi.service.ts";
import { generateTicket } from "../services/ticket.service.ts";
import { analyzeUpstream, extractRawHtmlUrl } from "../services/upstream.service.ts";

const upstreamRequestSchema = z.object({
  rawHtmlUrl: z.string().url().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  apiKey: z.string().optional(),
});

const ticketRequestSchema = z.object({
  summary: z.object({
    upstream: z.any().optional(),
    deepAnalysis: z.any().optional(),
    overallStatus: z.enum(["STABLE", "FLAKY", "PARSER_FAIL", "UPSTREAM_BLOCK"]),
    timestamp: z.string(),
  }),
  params: z.record(z.string(), z.unknown()),
});

const deepAnalysisSchema = z.object({
  params: z.record(z.string(), z.unknown()),
  engine: z.string().min(1),
  apiKey: z.string().min(1, "API key is required"),
});

const fullDiagnosticSchema = z.object({
  params: z.record(z.string(), z.unknown()),
  engine: z.string().min(1),
  apiKey: z.string().min(1, "API key is required"),
  runUpstream: z.boolean().default(true),
  runDeepAnalysis: z.boolean().default(true),
});

const diagnosticsRouter = new Hono()
  .post("/upstream/analyze", zValidator("json", upstreamRequestSchema), async (c) => {
    const { rawHtmlUrl, params, apiKey } = c.req.valid("json");

    let urlToAnalyze = rawHtmlUrl;

    if (!urlToAnalyze && params && apiKey) {
      const result = await callSerpApi({
        params: params as Parameters<typeof callSerpApi>[0]["params"],
        apiKey,
      });

      if (result.success && result.response) {
        urlToAnalyze = extractRawHtmlUrl(result.response as Record<string, unknown>) ?? undefined;
      }
    }

    if (!urlToAnalyze) {
      return c.json(
        {
          success: false,
          error: "No raw HTML URL available. Provide rawHtmlUrl or valid params with apiKey.",
        },
        400
      );
    }

    const report = await analyzeUpstream(urlToAnalyze);

    return c.json({
      success: true,
      data: report,
    });
  })

  .post("/ticket/generate", zValidator("json", ticketRequestSchema), async (c) => {
    const { summary, params } = c.req.valid("json");

    const ticket = generateTicket(summary as DiagnosticSummary, params);

    return c.json({
      success: true,
      data: ticket,
    });
  })

  .post("/deep-analysis", zValidator("json", deepAnalysisSchema), async (c) => {
    const { params, engine, apiKey } = c.req.valid("json");

    const result = await callSerpApi({
      params: { ...params, engine } as Parameters<typeof callSerpApi>[0]["params"],
      apiKey,
    });

    if (!result.success || !result.response) {
      return c.json(
        {
          success: false,
          error: result.error || "Failed to fetch data from SerpApi",
        },
        400
      );
    }

    const report = await performDeepAnalysis(engine, result.response as Record<string, unknown>);

    return c.json({
      success: true,
      data: {
        ...report,
        rawResponse: result.response,
      },
    });
  })

  .post("/full", zValidator("json", fullDiagnosticSchema), async (c) => {
    const { params, engine, apiKey, runUpstream, runDeepAnalysis } = c.req.valid("json");

    const summary: DiagnosticSummary = {
      overallStatus: "STABLE",
      timestamp: new Date().toISOString(),
    };

    const statuses: DiagnosticStatus[] = [];

    // Fetch API response
    const result = await callSerpApi({
      params: { ...params, engine } as Parameters<typeof callSerpApi>[0]["params"],
      apiKey,
    });

    if (!result.success || !result.response) {
      return c.json(
        {
          success: false,
          error: result.error || "Failed to fetch data from SerpApi",
        },
        400
      );
    }

    const apiResponse = result.response as Record<string, unknown>;

    // Run Deep Analysis (HTML vs JSON comparison)
    if (runDeepAnalysis) {
      const deepAnalysisReport = await performDeepAnalysis(engine, apiResponse);
      summary.deepAnalysis = deepAnalysisReport;

      if (deepAnalysisReport.hasCriticalIssues) {
        statuses.push("PARSER_FAIL");
      } else if (deepAnalysisReport.totalMissing > 0) {
        statuses.push("FLAKY");
      }
    }

    // Run Upstream Analysis (check for blocking)
    if (runUpstream) {
      const rawHtmlUrl = extractRawHtmlUrl(apiResponse);
      if (rawHtmlUrl) {
        const upstreamReport = await analyzeUpstream(rawHtmlUrl);
        summary.upstream = upstreamReport;
        statuses.push(upstreamReport.status);
      }
    }

    summary.overallStatus = determineOverallStatus(statuses);

    return c.json({
      success: true,
      data: summary,
    });
  });

function determineOverallStatus(statuses: DiagnosticStatus[]): DiagnosticStatus {
  if (statuses.includes("UPSTREAM_BLOCK")) return "UPSTREAM_BLOCK";
  if (statuses.includes("PARSER_FAIL")) return "PARSER_FAIL";
  if (statuses.includes("FLAKY")) return "FLAKY";
  return "STABLE";
}

export default diagnosticsRouter;
