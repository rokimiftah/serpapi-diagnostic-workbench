import type { DiagnosticStatus, DiagnosticSummary } from "../../shared/types/index.ts";
import type { MonitoringThresholds } from "../config/monitoring.config.ts";
import type { AlertSeverity } from "./alert.service.ts";

import { desc, eq } from "drizzle-orm";

import { db } from "../db/index.ts";
import { diagnosticRun } from "../db/schema.ts";

export interface Anomaly {
  type: "parsing_issue" | "upstream_block" | "status_change";
  message: string;
  severity: AlertSeverity;
  currentValue: number;
  previousValue?: number;
  threshold?: number;
}

function safeParseDiagnosticResult(result: string): DiagnosticSummary | null {
  try {
    return JSON.parse(result) as DiagnosticSummary;
  } catch {
    return null;
  }
}

export async function detectAnomalies(
  engine: string,
  currentResult: DiagnosticSummary,
  _thresholds: MonitoringThresholds
): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];

  const previousRuns = await db
    .select()
    .from(diagnosticRun)
    .where(eq(diagnosticRun.engine, engine))
    .orderBy(desc(diagnosticRun.createdAt))
    .limit(5);

  const previousResult = previousRuns[0] ? safeParseDiagnosticResult(previousRuns[0].result) : null;

  // Check for parsing issues (missing sections in JSON)
  const missingSections = currentResult.deepAnalysis?.totalMissing ?? 0;
  const criticalMissing = currentResult.deepAnalysis?.criticalMissing ?? 0;

  const previousMissing = previousResult?.deepAnalysis?.totalMissing ?? 0;
  const previousCritical = previousResult?.deepAnalysis?.criticalMissing ?? 0;

  // Option 3: emit parsing_issue only when missing increases
  if (criticalMissing > previousCritical) {
    anomalies.push({
      type: "parsing_issue",
      message: `Critical parsing issue worsened: ${criticalMissing} critical section(s) missing (prev ${previousCritical})`,
      severity: "critical",
      currentValue: criticalMissing,
      previousValue: previousCritical,
    });
  } else if (missingSections > previousMissing) {
    anomalies.push({
      type: "parsing_issue",
      message: `Parsing issue worsened: ${missingSections} section(s) missing (prev ${previousMissing})`,
      severity: "warning",
      currentValue: missingSections,
      previousValue: previousMissing,
    });
  }

  // Check for upstream blocking
  if (currentResult.upstream?.isBlocked) {
    anomalies.push({
      type: "upstream_block",
      message: `Upstream blocking detected: ${currentResult.upstream.alertMessage || "CAPTCHA or rate limit"}`,
      severity: "critical",
      currentValue: 1,
    });
  }

  // Check for status changes
  if (previousRuns.length > 0) {
    const lastRun = previousRuns[0];
    const previousStatus = lastRun.status;
    const currentStatus = currentResult.overallStatus;

    if (previousStatus === "STABLE" && currentStatus !== "STABLE") {
      anomalies.push({
        type: "status_change",
        message: buildStatusChangeMessage(previousStatus, currentStatus, currentResult),
        severity: currentStatus === "UPSTREAM_BLOCK" ? "critical" : "warning",
        currentValue: 0,
        previousValue: 0,
      });
    }
  }

  return anomalies;
}

function buildStatusChangeMessage(
  previousStatus: string,
  currentStatus: DiagnosticStatus,
  currentResult: DiagnosticSummary
): string {
  if (currentStatus === "FLAKY") {
    const missing = currentResult.deepAnalysis?.totalMissing ?? 0;
    const missingSections = currentResult.deepAnalysis?.htmlComparison?.missingInJson?.slice(0, 3).map((m) => m.section) ?? [];
    const sectionHint = missingSections.length > 0 ? ` (e.g., ${missingSections.join(", ")})` : "";
    return `Status changed from ${previousStatus} to ${currentStatus} | ${missing} non-critical missing section(s)${sectionHint}`;
  }

  if (currentStatus === "PARSER_FAIL") {
    const critical = currentResult.deepAnalysis?.criticalMissing ?? 0;
    const criticalSections =
      currentResult.deepAnalysis?.htmlComparison?.missingInJson
        ?.filter((m) => m.severity === "critical")
        .slice(0, 3)
        .map((m) => m.section) ?? [];
    const sectionHint = criticalSections.length > 0 ? ` (e.g., ${criticalSections.join(", ")})` : "";
    return `Status changed from ${previousStatus} to ${currentStatus} | ${critical} critical missing section(s)${sectionHint}`;
  }

  if (currentStatus === "UPSTREAM_BLOCK") {
    const upstreamReason = currentResult.upstream?.alertMessage || "CAPTCHA or rate limit";
    return `Status changed from ${previousStatus} to ${currentStatus} | ${upstreamReason}`;
  }

  return `Status changed from ${previousStatus} to ${currentStatus}`;
}

export async function getEngineHealthHistory(engine: string, days: number = 7) {
  const runs = await db
    .select()
    .from(diagnosticRun)
    .where(eq(diagnosticRun.engine, engine))
    .orderBy(desc(diagnosticRun.createdAt))
    .limit(days * 24);

  return runs.map((run) => {
    let result: DiagnosticSummary | null = null;
    try {
      result = JSON.parse(run.result) as DiagnosticSummary;
    } catch {
      // Invalid JSON
    }

    return {
      id: run.id,
      engine: run.engine,
      status: run.status,
      missingSections: result?.deepAnalysis?.totalMissing ?? null,
      criticalMissing: result?.deepAnalysis?.criticalMissing ?? null,
      isBlocked: result?.upstream?.isBlocked ?? null,
      createdAt: run.createdAt,
    };
  });
}
