import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../lib/rpc";

interface EngineStatus {
  engine: string;
  label: string;
  enabled: boolean;
  status: string;
  statusReason: string;
  missingSections: number | null;
  criticalMissing: number | null;
  missingSectionNames: string[];
  isBlocked: boolean | null;
  lastRunAt: string | null;
}

interface MonitoringStatus {
  enabled: boolean;
  intervalHours: number;
  thresholds: {
    successRateThreshold: number;
    errorRateThreshold: number;
    latencyThresholdMs: number;
  };
  engines: EngineStatus[];
  unreadAlerts: number;
}

interface Alert {
  id: string;
  engine: string;
  type: string;
  status: string;
  message: string;
  severity: string;
  createdAt: string;
}

interface HistoryItem {
  id: string;
  engine: string;
  type: string;
  status: string;
  missingSections: number | null;
  criticalMissing: number | null;
  isBlocked: boolean | null;
  createdAt: string;
}

const STATUS_CONFIG = {
  STABLE: {
    bg: "bg-green-600",
    text: "text-white",
    border: "border-green-200",
    light: "bg-green-50",
  },
  FLAKY: {
    bg: "bg-yellow-500",
    text: "text-white",
    border: "border-yellow-200",
    light: "bg-yellow-50",
  },
  PARSER_FAIL: {
    bg: "bg-red-600",
    text: "text-white",
    border: "border-red-200",
    light: "bg-red-50",
  },
  UPSTREAM_BLOCK: {
    bg: "bg-gray-800",
    text: "text-white",
    border: "border-gray-300",
    light: "bg-gray-100",
  },
  unknown: {
    bg: "bg-gray-200",
    text: "text-gray-600",
    border: "border-gray-200",
    light: "bg-gray-50",
  },
};

function StatusBadge({ status, size = "sm" }: { status: string; size?: "sm" | "lg" }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unknown;
  const sizeClass = size === "lg" ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-xs";

  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${config.bg} ${config.text} ${sizeClass}`}>
      {status}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    info: "bg-blue-100 text-blue-800 border-blue-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    critical: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${colors[severity] || colors.info}`}
    >
      {severity}
    </span>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  status,
}: {
  label: string;
  value: string | number | null;
  suffix?: string;
  status?: "good" | "warning" | "bad";
}) {
  const statusColors = {
    good: "text-green-600",
    warning: "text-yellow-600",
    bad: "text-red-600",
  };
  const valueColor = status ? statusColors[status] : "text-gray-900";

  return (
    <div className="text-center">
      <div className="text-xs tracking-wide text-gray-500 uppercase">{label}</div>
      <div className={`text-lg font-bold ${valueColor}`}>
        {value ?? "--"}
        {suffix && value !== null ? suffix : ""}
      </div>
    </div>
  );
}

function EngineCard({ engine }: { engine: EngineStatus }) {
  const config = STATUS_CONFIG[engine.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unknown;
  const missingStatus =
    engine.missingSections === null
      ? undefined
      : engine.missingSections === 0
        ? "good"
        : engine.criticalMissing && engine.criticalMissing > 0
          ? "bad"
          : "warning";
  const blockedStatus = engine.isBlocked === null ? undefined : engine.isBlocked ? "bad" : "good";

  return (
    <div
      className={`rounded-xl border ${config.border} overflow-hidden bg-white shadow-sm transition-all duration-200 hover:shadow-md`}
    >
      <div className="bg-slate-700 px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-base font-bold text-white sm:text-lg">{engine.label}</h3>
          <StatusBadge status={engine.status} size="lg" />
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {engine.statusReason && (
          <div
            className={`mb-3 rounded-lg ${config.light} border px-2 py-1.5 text-xs text-gray-700 sm:mb-4 sm:px-3 sm:py-2 sm:text-sm ${config.border}`}
          >
            <span className="font-medium">Reason:</span> {engine.statusReason}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <MetricCard label="Missing" value={engine.missingSections} suffix="" status={missingStatus} />
          <MetricCard
            label="Critical"
            value={engine.criticalMissing}
            suffix=""
            status={engine.criticalMissing && engine.criticalMissing > 0 ? "bad" : "good"}
          />
          <MetricCard label="Blocked" value={engine.isBlocked ? "YES" : "NO"} suffix="" status={blockedStatus} />
        </div>

        {engine.missingSectionNames && engine.missingSectionNames.length > 0 && (
          <div className="mt-3 border-t border-gray-100 pt-2">
            <div className="mb-1 text-xs text-gray-500">Missing sections:</div>
            <div className="flex flex-wrap gap-1">
              {engine.missingSectionNames.map((name) => (
                <span key={name} className="inline-block rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-800">
                  {name.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 border-t border-gray-100 pt-2 text-center text-xs text-gray-400 sm:mt-4 sm:pt-3">
          {engine.lastRunAt ? `Last: ${new Date(engine.lastRunAt).toLocaleString()}` : "Never scanned"}
        </div>
      </div>
    </div>
  );
}

function StatsOverview({ engines }: { engines: EngineStatus[] }) {
  const stable = engines.filter((e) => e.status === "STABLE").length;
  const flaky = engines.filter((e) => e.status === "FLAKY").length;
  const failed = engines.filter((e) => e.status === "PARSER_FAIL" || e.status === "UPSTREAM_BLOCK").length;
  const total = engines.length;

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      <div className="rounded-lg bg-blue-600 p-2 text-center text-white sm:rounded-xl sm:p-4 sm:text-left">
        <div className="text-xl font-bold sm:text-3xl">{total}</div>
        <div className="hidden text-sm text-blue-100 sm:block">Total Engines</div>
        <div className="text-xs text-blue-100 sm:hidden">Total</div>
      </div>
      <div className="rounded-lg bg-green-600 p-2 text-center text-white sm:rounded-xl sm:p-4 sm:text-left">
        <div className="text-xl font-bold sm:text-3xl">{stable}</div>
        <div className="hidden text-sm text-green-100 sm:block">Healthy</div>
        <div className="text-xs text-green-100 sm:hidden">OK</div>
      </div>
      <div className="rounded-lg bg-yellow-500 p-2 text-center text-white sm:rounded-xl sm:p-4 sm:text-left">
        <div className="text-xl font-bold sm:text-3xl">{flaky}</div>
        <div className="text-xs text-yellow-100 sm:text-sm">Flaky</div>
      </div>
      <div className="rounded-lg bg-red-600 p-2 text-center text-white sm:rounded-xl sm:p-4 sm:text-left">
        <div className="text-xl font-bold sm:text-3xl">{failed}</div>
        <div className="hidden text-sm text-red-100 sm:block">Issues</div>
        <div className="text-xs text-red-100 sm:hidden">Bad</div>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full cursor-pointer items-center justify-between bg-gray-50 px-3 py-2 transition-colors hover:bg-gray-100 sm:px-4 sm:py-3"
      >
        <h2 className="text-sm font-semibold text-gray-900 sm:text-lg">{title}</h2>
        <span className={`transform text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}>v</span>
      </button>
      {isOpen && <div className="border-t border-gray-100 p-3 sm:p-4">{children}</div>}
    </div>
  );
}

export function Monitoring() {
  const queryClient = useQueryClient();

  const { data: status, isLoading: statusLoading } = useQuery<MonitoringStatus>({
    queryKey: ["monitoring", "status"],
    queryFn: async () => {
      const res = await client.monitoring.status.$get();
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: alertsData } = useQuery<{ alerts: Alert[]; unreadCount: number }>({
    queryKey: ["monitoring", "alerts"],
    queryFn: async () => {
      const res = await client.monitoring.alerts.$get({ query: { limit: "20" } });
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: historyData } = useQuery<{ history: HistoryItem[] }>({
    queryKey: ["monitoring", "history"],
    queryFn: async () => {
      const res = await client.monitoring.history.$get({ query: { limit: "20" } });
      return res.json();
    },
    refetchInterval: 30000,
  });

  const triggerScan = useMutation({
    mutationFn: async (engine?: string) => {
      const res = await client.monitoring.trigger.$post({ json: { engine } });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitoring"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await client.monitoring.alerts["read-all"].$post({});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitoring", "alerts"] });
    },
  });

  if (statusLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <div className="mt-2 text-gray-500">Loading monitoring data...</div>
        </div>
      </div>
    );
  }

  const engines = status?.engines ?? [];

  return (
    <main className="mx-auto max-w-7xl overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6 md:px-6">
      {/* Page Header */}
      <div className="mb-4 flex flex-col items-center gap-3 sm:mb-6 sm:flex-row sm:justify-between sm:gap-4">
        <div className="text-center sm:text-left">
          <h2 className="text-lg font-bold text-gray-900 sm:text-xl">Proactive Monitoring</h2>
          <p className="text-xs text-gray-500 sm:text-sm">Automated health checks for all endpoints</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {alertsData?.unreadCount ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800 sm:px-3 sm:py-1.5 sm:text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 sm:h-2 sm:w-2" />
              {alertsData.unreadCount} alerts
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => triggerScan.mutate(undefined)}
            disabled={triggerScan.isPending}
            className="cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:py-2.5 sm:text-sm"
          >
            {triggerScan.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent sm:h-4 sm:w-4" />
                Scanning...
              </span>
            ) : (
              "Run Full Scan"
            )}
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="mb-4 sm:mb-6">
        <StatsOverview engines={engines} />
      </div>

      {/* Main Grid - Stack on mobile, 3 cols on lg */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Left Column - Engine Cards & History */}
        <div className="space-y-4 sm:space-y-6 lg:col-span-2">
          {/* Engine Health Cards */}
          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4 md:p-6">
            <h2 className="mb-3 text-base font-semibold text-gray-900 sm:mb-4 sm:text-lg">Engine Health</h2>
            {/* 1 col mobile, 2 cols sm+ */}
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              {engines.map((engine) => (
                <EngineCard key={engine.engine} engine={engine} />
              ))}
            </div>
            {engines.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-500 sm:py-12">
                No engines configured. Check your monitoring settings.
              </div>
            )}
          </div>

          {/* Recent History */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 sm:px-4 sm:py-3">
              <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Recent Scans</h2>
            </div>

            {/* Mobile: Card layout */}
            <div className="block sm:hidden">
              <div className="divide-y divide-gray-100">
                {(historyData?.history ?? []).slice(0, 10).map((item: HistoryItem) => (
                  <div key={item.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{item.engine}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span
                        className={
                          item.missingSections === 0
                            ? "font-semibold text-green-600"
                            : item.criticalMissing && item.criticalMissing > 0
                              ? "font-semibold text-red-600"
                              : "font-semibold text-yellow-600"
                        }
                      >
                        {item.missingSections !== null ? `${item.missingSections} missing` : "--"}
                      </span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
              {(!historyData?.history || historyData.history.length === 0) && (
                <div className="py-8 text-center text-sm text-gray-500">No scans yet.</div>
              )}
            </div>

            {/* Desktop: Table layout */}
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">Engine</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Missing</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">Blocked</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(historyData?.history ?? []).map((item: HistoryItem) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{item.engine}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            item.missingSections === 0
                              ? "font-semibold text-green-600"
                              : item.criticalMissing && item.criticalMissing > 0
                                ? "font-semibold text-red-600"
                                : "font-semibold text-yellow-600"
                          }
                        >
                          {item.missingSections !== null ? item.missingSections : "--"}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                        {item.isBlocked ? (
                          <span className="font-semibold text-red-600">YES</span>
                        ) : (
                          <span className="text-green-600">NO</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!historyData?.history || historyData.history.length === 0) && (
                <div className="py-12 text-center text-gray-500">No scans yet. Click "Run Full Scan" to start.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Alerts & Info */}
        <div className="space-y-4 sm:space-y-6">
          {/* Alerts Panel */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2 sm:px-4 sm:py-3">
              <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Alerts</h2>
              {alertsData?.unreadCount ? (
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700 sm:text-sm"
                >
                  Mark all read
                </button>
              ) : null}
            </div>
            <div className="max-h-60 overflow-y-auto p-3 sm:max-h-80 sm:p-4">
              <div className="space-y-2 sm:space-y-3">
                {(alertsData?.alerts ?? []).map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-lg border p-2 transition-colors sm:p-3 ${
                      alert.status === "pending" ? "border-yellow-200 bg-yellow-50" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-gray-900">{alert.engine}</span>
                      <SeverityBadge severity={alert.severity} />
                    </div>
                    <p className="mt-1 text-xs text-gray-600 sm:text-sm">{alert.message}</p>
                    <div className="mt-1 text-xs text-gray-400 sm:mt-2">{new Date(alert.createdAt).toLocaleString()}</div>
                  </div>
                ))}
                {(!alertsData?.alerts || alertsData.alerts.length === 0) && (
                  <div className="py-6 text-center text-sm text-gray-500 sm:py-8">All systems healthy!</div>
                )}
              </div>
            </div>
          </div>

          {/* Thresholds */}
          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <h2 className="mb-2 text-base font-semibold text-gray-900 sm:mb-3 sm:text-lg">Settings</h2>
            <div className="space-y-1 text-xs sm:space-y-2 sm:text-sm">
              <div className="flex justify-between py-1.5 sm:py-2">
                <span className="text-gray-500">Scheduler</span>
                <span className={`font-semibold ${status?.enabled ? "text-green-600" : "text-gray-400"}`}>
                  {status?.enabled ? `Every ${status?.intervalHours}h` : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          {/* Diagnostic Tests Explained - Collapsible */}
          <CollapsibleSection title="How Tests Work">
            <div className="space-y-3 sm:space-y-4">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-2 sm:p-3">
                <div className="text-sm font-semibold text-blue-800">Deep Analysis</div>
                <p className="mt-1 text-xs text-gray-600">Compare raw HTML from source with JSON response</p>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                  <span className="rounded bg-white px-1 py-0.5 text-center">0 missing = OK</span>
                  <span className="rounded bg-white px-1 py-0.5 text-center">1+ = BUG</span>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 sm:p-3">
                <div className="text-sm font-semibold text-gray-800">Upstream Check</div>
                <p className="mt-1 text-xs text-gray-600">Detect blocking patterns in raw HTML</p>
                <div className="mt-2 flex flex-wrap gap-1 text-xs">
                  <span className="rounded bg-white px-1.5 py-0.5">CAPTCHA</span>
                  <span className="rounded bg-white px-1.5 py-0.5">denied</span>
                  <span className="rounded bg-white px-1.5 py-0.5">limit</span>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Status Definitions - Collapsible */}
          <CollapsibleSection title="Status Definitions">
            <div className="space-y-2 sm:space-y-3">
              {Object.entries(STATUS_CONFIG)
                .filter(([key]) => key !== "unknown")
                .map(([statusKey, config]) => (
                  <div key={statusKey} className={`rounded-lg border ${config.border} ${config.light} p-2 sm:p-3`}>
                    <StatusBadge status={statusKey} />
                    <p className="mt-1 text-xs text-gray-600 sm:mt-2">
                      {statusKey === "STABLE" && "All checks passed"}
                      {statusKey === "FLAKY" && "Intermittent issues"}
                      {statusKey === "PARSER_FAIL" && "Data quality issues"}
                      {statusKey === "UPSTREAM_BLOCK" && "Source blocked"}
                    </p>
                  </div>
                ))}
            </div>
          </CollapsibleSection>

          {/* Monitored Engines - Collapsible */}
          <CollapsibleSection title="Monitored Engines">
            <div className="space-y-1.5 sm:space-y-2">
              {[
                { name: "google", param: "coffee" },
                { name: "google_shopping", param: "laptop" },
                { name: "google_news", param: "tech" },
                { name: "youtube", param: "dQw..." },
                { name: "ebay", param: "camera" },
                { name: "naver", param: "seoul" },
              ].map((engine) => (
                <div
                  key={engine.name}
                  className="flex items-center justify-between gap-2 rounded border border-gray-100 p-1.5 sm:p-2"
                >
                  <span className="truncate text-xs font-medium text-gray-900 sm:text-sm">{engine.name}</span>
                  <code className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{engine.param}</code>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </main>
  );
}
