import type { DiagnosticStatus, DiagnosticSummary } from "../../shared/types/index.ts";
import type { EngineMonitorConfig } from "../config/monitoring.config.ts";

import { eq } from "drizzle-orm";

import { getMonitoringConfig } from "../config/monitoring.config.ts";
import { db } from "../db/index.ts";
import { diagnosticRun, monitoringConfig } from "../db/schema.ts";
import { createAlert } from "./alert.service.ts";
import { detectAnomalies } from "./anomaly.service.ts";
import { performDeepAnalysis } from "./deep-analysis.service.ts";
import { callSerpApi, getRawHtmlUrl } from "./serpapi.service.ts";
import { analyzeUpstream } from "./upstream.service.ts";

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export async function startScheduler() {
  const config = getMonitoringConfig();

  if (!config.enabled) {
    console.log("[Scheduler] Monitoring disabled");
    return;
  }

  const intervalMs = config.intervalHours * 60 * 60 * 1000;

  console.log(`[Scheduler] Starting with interval: ${config.intervalHours}h`);

  schedulerInterval = setInterval(async () => {
    await runScheduledDiagnostics();
  }, intervalMs);

  await runScheduledDiagnostics();
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[Scheduler] Stopped");
  }
}

export async function runScheduledDiagnostics() {
  const config = getMonitoringConfig();
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    console.error("[Scheduler] SERPAPI_API_KEY not configured");
    return;
  }

  console.log(`[Scheduler] Running diagnostics for ${config.engines.length} engines`);

  for (const engineConfig of config.engines) {
    if (!engineConfig.enabled) continue;

    try {
      const result = await runEngineDiagnostic(engineConfig, apiKey);

      const anomalies = await detectAnomalies(engineConfig.engine, result, config.thresholds);

      const runId = await saveDiagnosticRun(engineConfig, result);

      for (const anomaly of anomalies) {
        await createAlert({
          engine: engineConfig.engine,
          type: "dashboard",
          message: anomaly.message,
          severity: anomaly.severity,
          diagnosticRunId: runId,
        });
      }

      console.log(`[Scheduler] ${engineConfig.engine}: ${result.overallStatus}`);
    } catch (error) {
      console.error(`[Scheduler] Error for ${engineConfig.engine}:`, error);
    }
  }
}

async function runEngineDiagnostic(engineConfig: EngineMonitorConfig, apiKey: string): Promise<DiagnosticSummary> {
  // Fetch API response
  const apiResult = await callSerpApi({
    params: { ...engineConfig.params, engine: engineConfig.engine },
    apiKey,
  });

  if (!apiResult.success || !apiResult.response) {
    return {
      overallStatus: "UPSTREAM_BLOCK",
      timestamp: new Date().toISOString(),
    };
  }

  const apiResponse = apiResult.response as Record<string, unknown>;
  const statuses: DiagnosticStatus[] = [];

  // Run Deep Analysis (HTML vs JSON comparison)
  const deepAnalysisReport = await performDeepAnalysis(engineConfig.engine, apiResponse);

  if (deepAnalysisReport.hasCriticalIssues) {
    statuses.push("PARSER_FAIL");
  } else if (deepAnalysisReport.totalMissing > 0) {
    // Non-critical parsing gaps: treat as flaky rather than stable
    statuses.push("FLAKY");
  }

  // Run Upstream Analysis
  const rawHtmlUrl = getRawHtmlUrl(apiResponse);
  let upstreamReport: Awaited<ReturnType<typeof analyzeUpstream>> | undefined;
  if (rawHtmlUrl) {
    upstreamReport = await analyzeUpstream(rawHtmlUrl);
    statuses.push(upstreamReport.status);
  }

  // Determine overall status
  let overallStatus: DiagnosticStatus = "STABLE";
  if (statuses.includes("UPSTREAM_BLOCK")) {
    overallStatus = "UPSTREAM_BLOCK";
  } else if (statuses.includes("PARSER_FAIL")) {
    overallStatus = "PARSER_FAIL";
  } else if (statuses.includes("FLAKY")) {
    overallStatus = "FLAKY";
  }

  return {
    deepAnalysis: deepAnalysisReport,
    upstream: upstreamReport,
    overallStatus,
    timestamp: new Date().toISOString(),
  };
}

async function saveDiagnosticRun(engineConfig: EngineMonitorConfig, result: DiagnosticSummary): Promise<string> {
  const id = crypto.randomUUID();

  await db.insert(diagnosticRun).values({
    id,
    type: "scheduled",
    engine: engineConfig.engine,
    params: JSON.stringify(engineConfig.params),
    result: JSON.stringify(result),
    status: result.overallStatus,
  });

  await db
    .update(monitoringConfig)
    .set({ lastRunAt: new Date(), updatedAt: new Date() })
    .where(eq(monitoringConfig.engine, engineConfig.engine));

  return id;
}

export async function triggerManualScan(engine?: string) {
  const config = getMonitoringConfig();
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    throw new Error("SERPAPI_API_KEY not configured");
  }

  const enginesToScan = engine ? config.engines.filter((e) => e.engine === engine) : config.engines.filter((e) => e.enabled);

  // Run in parallel with timeout per engine
  const scanPromises = enginesToScan.map(async (engineConfig) => {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 20000));

      const scanPromise = (async () => {
        const result = await runEngineDiagnostic(engineConfig, apiKey);
        await saveDiagnosticRun(engineConfig, result);
        return { engine: engineConfig.engine, status: result.overallStatus };
      })();

      return await Promise.race([scanPromise, timeoutPromise]);
    } catch (error) {
      console.error(`[Scan] ${engineConfig.engine} failed:`, error);
      return { engine: engineConfig.engine, status: "UPSTREAM_BLOCK" as DiagnosticStatus };
    }
  });

  const results = await Promise.all(scanPromises);
  return results;
}
