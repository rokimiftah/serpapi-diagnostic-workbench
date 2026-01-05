import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const diagnosticRun = sqliteTable("diagnostic_run", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  engine: text("engine").notNull(),
  params: text("params").notNull(),
  result: text("result").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const monitoringConfig = sqliteTable("monitoring_config", {
  id: text("id").primaryKey(),
  engine: text("engine").notNull(),
  params: text("params").notNull(),
  intervalHours: integer("interval_hours").notNull().default(1),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  lastRunAt: integer("last_run_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const alert = sqliteTable("alert", {
  id: text("id").primaryKey(),
  diagnosticRunId: text("diagnostic_run_id").references(() => diagnosticRun.id, { onDelete: "cascade" }),
  engine: text("engine").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  message: text("message").notNull(),
  severity: text("severity").notNull().default("warning"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type DiagnosticRun = typeof diagnosticRun.$inferSelect;
export type NewDiagnosticRun = typeof diagnosticRun.$inferInsert;
export type MonitoringConfig = typeof monitoringConfig.$inferSelect;
export type NewMonitoringConfig = typeof monitoringConfig.$inferInsert;
export type Alert = typeof alert.$inferSelect;
export type NewAlert = typeof alert.$inferInsert;
