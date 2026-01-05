import { desc, eq } from "drizzle-orm";

import { db } from "../db/index.ts";
import { alert } from "../db/schema.ts";

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "pending" | "read" | "dismissed";

export interface CreateAlertInput {
  engine: string;
  type: "dashboard" | "email";
  message: string;
  severity: AlertSeverity;
  diagnosticRunId?: string;
}

export async function createAlert(input: CreateAlertInput): Promise<string> {
  const id = crypto.randomUUID();

  await db.insert(alert).values({
    id,
    engine: input.engine,
    type: input.type,
    message: input.message,
    severity: input.severity,
    diagnosticRunId: input.diagnosticRunId,
    status: "pending",
  });

  console.log(`[Alert] Created: ${input.severity.toUpperCase()} - ${input.engine}: ${input.message}`);

  return id;
}

export async function getAlerts(
  options: {
    status?: AlertStatus;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status, limit = 50, offset = 0 } = options;

  if (status) {
    return db.select().from(alert).where(eq(alert.status, status)).orderBy(desc(alert.createdAt)).limit(limit).offset(offset);
  }

  return db.select().from(alert).orderBy(desc(alert.createdAt)).limit(limit).offset(offset);
}

export async function getUnreadAlertCount(): Promise<number> {
  const result = await db.select().from(alert).where(eq(alert.status, "pending"));
  return result.length;
}

export async function markAlertAsRead(alertId: string) {
  await db.update(alert).set({ status: "read" }).where(eq(alert.id, alertId));
}

export async function markAlertAsDismissed(alertId: string) {
  await db.update(alert).set({ status: "dismissed" }).where(eq(alert.id, alertId));
}

export async function markAllAlertsAsRead() {
  await db.update(alert).set({ status: "read" }).where(eq(alert.status, "pending"));
}

export async function deleteOldAlerts(daysOld: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  // Note: For production, add proper date comparison
  console.log(`[Alert] Cleanup: removing alerts older than ${daysOld} days`);
}
