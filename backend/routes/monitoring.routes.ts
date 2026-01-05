import type { DiagnosticSummary } from "../../shared/types/index.ts";
import type { AlertStatus } from "../services/alert.service.ts";

import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { DEFAULT_ENGINE_CONFIGS, getMonitoringConfig } from "../config/monitoring.config.ts";
import { db } from "../db/index.ts";
import { diagnosticRun, monitoringConfig } from "../db/schema.ts";
import { getAlerts, getUnreadAlertCount, markAlertAsRead, markAllAlertsAsRead } from "../services/alert.service.ts";
import { getEngineHealthHistory } from "../services/anomaly.service.ts";
import { triggerManualScan } from "../services/scheduler.service.ts";

const monitoringRouter = new Hono()

  .get("/status", async (c) => {
    const config = getMonitoringConfig();

    const engineStatuses = await Promise.all(
      config.engines.map(async (engineConfig) => {
        const lastRun = await db
          .select()
          .from(diagnosticRun)
          .where(eq(diagnosticRun.engine, engineConfig.engine))
          .orderBy(desc(diagnosticRun.createdAt))
          .limit(1);

        let lastResult: DiagnosticSummary | null = null;
        if (lastRun[0]) {
          try {
            lastResult = JSON.parse(lastRun[0].result) as DiagnosticSummary;
          } catch {
            // Invalid JSON
          }
        }

        const statusReason = generateStatusReason(lastRun[0]?.status, lastResult);

        // Get missing section names
        const missingSectionNames = lastResult?.deepAnalysis?.htmlComparison?.missingInJson?.map((m) => m.section) ?? [];

        return {
          engine: engineConfig.engine,
          label: engineConfig.label,
          enabled: engineConfig.enabled,
          status: lastRun[0]?.status ?? "unknown",
          statusReason,
          missingSections: lastResult?.deepAnalysis?.totalMissing ?? null,
          criticalMissing: lastResult?.deepAnalysis?.criticalMissing ?? null,
          missingSectionNames,
          isBlocked: lastResult?.upstream?.isBlocked ?? null,
          lastRunAt: lastRun[0]?.createdAt ?? null,
        };
      })
    );

    const unreadAlerts = await getUnreadAlertCount();

    return c.json({
      enabled: config.enabled,
      intervalHours: config.intervalHours,
      thresholds: config.thresholds,
      engines: engineStatuses,
      unreadAlerts,
    });
  })

  .get(
    "/history",
    zValidator(
      "query",
      z.object({
        engine: z.string().optional(),
        limit: z.coerce.number().min(1).max(100).default(50),
        offset: z.coerce.number().min(0).default(0),
      })
    ),
    async (c) => {
      const { engine, limit, offset } = c.req.valid("query");

      const runs = engine
        ? await db
            .select()
            .from(diagnosticRun)
            .where(eq(diagnosticRun.engine, engine))
            .orderBy(desc(diagnosticRun.createdAt))
            .limit(limit)
            .offset(offset)
        : await db.select().from(diagnosticRun).orderBy(desc(diagnosticRun.createdAt)).limit(limit).offset(offset);

      const history = runs.map((run) => {
        let result: DiagnosticSummary | null = null;
        try {
          result = JSON.parse(run.result) as DiagnosticSummary;
        } catch {
          // Invalid JSON
        }

        return {
          id: run.id,
          engine: run.engine,
          type: run.type,
          status: run.status,
          missingSections: result?.deepAnalysis?.totalMissing ?? null,
          criticalMissing: result?.deepAnalysis?.criticalMissing ?? null,
          isBlocked: result?.upstream?.isBlocked ?? null,
          createdAt: run.createdAt,
        };
      });

      return c.json({ history, limit, offset });
    }
  )

  .get(
    "/history/:engine/chart",
    zValidator(
      "param",
      z.object({
        engine: z.string(),
      })
    ),
    zValidator(
      "query",
      z.object({
        days: z.coerce.number().min(1).max(30).default(7),
      })
    ),
    async (c) => {
      const { engine } = c.req.valid("param");
      const { days } = c.req.valid("query");

      const history = await getEngineHealthHistory(engine, days);

      return c.json({ engine, days, data: history });
    }
  )

  .get(
    "/alerts",
    zValidator(
      "query",
      z.object({
        status: z.enum(["pending", "read", "dismissed"]).optional(),
        limit: z.coerce.number().min(1).max(100).default(50),
        offset: z.coerce.number().min(0).default(0),
      })
    ),
    async (c) => {
      const { status, limit, offset } = c.req.valid("query");

      const alerts = await getAlerts({ status: status as AlertStatus | undefined, limit, offset });
      const unreadCount = await getUnreadAlertCount();

      return c.json({ alerts, unreadCount, limit, offset });
    }
  )

  .post(
    "/alerts/:id/read",
    zValidator(
      "param",
      z.object({
        id: z.string(),
      })
    ),
    async (c) => {
      const { id } = c.req.valid("param");
      await markAlertAsRead(id);
      return c.json({ success: true });
    }
  )

  .post("/alerts/read-all", async (c) => {
    await markAllAlertsAsRead();
    return c.json({ success: true });
  })

  .post(
    "/trigger",
    zValidator(
      "json",
      z.object({
        engine: z.string().optional(),
      })
    ),
    async (c) => {
      const { engine } = c.req.valid("json");

      try {
        const results = await triggerManualScan(engine);
        return c.json({ success: true, results });
      } catch (error) {
        return c.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          500
        );
      }
    }
  )

  .get("/config", async (c) => {
    const configs = await db.select().from(monitoringConfig).orderBy(monitoringConfig.engine);

    if (configs.length === 0) {
      return c.json({
        configs: DEFAULT_ENGINE_CONFIGS.map((e) => ({
          ...e,
          id: null,
          lastRunAt: null,
          createdAt: null,
          updatedAt: null,
        })),
      });
    }

    return c.json({ configs });
  })

  .post(
    "/config",
    zValidator(
      "json",
      z.object({
        engine: z.string(),
        params: z.record(z.string(), z.unknown()),
        intervalHours: z.number().min(1).max(24).default(1),
        enabled: z.boolean().default(true),
      })
    ),
    async (c) => {
      const input = c.req.valid("json");
      const id = crypto.randomUUID();

      const existing = await db.select().from(monitoringConfig).where(eq(monitoringConfig.engine, input.engine)).limit(1);

      if (existing.length > 0) {
        await db
          .update(monitoringConfig)
          .set({
            params: JSON.stringify(input.params),
            intervalHours: input.intervalHours,
            enabled: input.enabled,
            updatedAt: new Date(),
          })
          .where(eq(monitoringConfig.engine, input.engine));

        return c.json({ success: true, id: existing[0].id, updated: true });
      }

      await db.insert(monitoringConfig).values({
        id,
        engine: input.engine,
        params: JSON.stringify(input.params),
        intervalHours: input.intervalHours,
        enabled: input.enabled,
      });

      return c.json({ success: true, id, created: true });
    }
  );

function generateStatusReason(status: string | undefined, result: DiagnosticSummary | null): string {
  if (!status || status === "unknown") {
    return "Never scanned";
  }

  if (status === "STABLE") {
    return "All checks passed: No parsing issues, no blocking detected";
  }

  if (status === "FLAKY") {
    const missing = result?.deepAnalysis?.totalMissing ?? 0;
    if (missing > 0) {
      const missingSections = result?.deepAnalysis?.htmlComparison?.missingInJson?.slice(0, 3).map((m) => m.section) ?? [];
      const sectionHint = missingSections.length > 0 ? ` | Missing: ${missingSections.join(", ")}` : "";
      return `Non-critical parsing gaps detected: ${missing} section(s) in HTML but missing in JSON${sectionHint}`;
    }
    return "Intermittent issues detected";
  }

  const reasons: string[] = [];

  if (status === "PARSER_FAIL") {
    const missing = result?.deepAnalysis?.totalMissing ?? 0;
    const critical = result?.deepAnalysis?.criticalMissing ?? 0;
    if (critical > 0) {
      reasons.push(`${critical} critical sections in HTML but missing in JSON`);
    } else if (missing > 0) {
      reasons.push(`${missing} sections in HTML but missing in JSON`);
    }
    if (result?.deepAnalysis?.htmlComparison?.missingInJson?.length) {
      const missingSections = result.deepAnalysis.htmlComparison.missingInJson.slice(0, 3).map((m) => m.section);
      reasons.push(`Missing: ${missingSections.join(", ")}`);
    }
    return reasons.length > 0 ? reasons.join(" | ") : "Data in HTML not present in JSON response";
  }

  if (status === "UPSTREAM_BLOCK") {
    if (result?.upstream?.alertMessage) {
      reasons.push(`Upstream: ${result.upstream.alertMessage}`);
    } else if (result?.upstream?.isBlocked) {
      const patterns = result.upstream.blockPatterns?.filter((p) => p.found).map((p) => p.pattern);
      if (patterns?.length) {
        reasons.push(`Detected: ${patterns.join(", ")}`);
      } else {
        reasons.push("Source is blocking access (CAPTCHA or rate limit)");
      }
    }
    return reasons.length > 0 ? reasons.join(" | ") : "Data source inaccessible";
  }

  return "Unknown status";
}

export default monitoringRouter;
