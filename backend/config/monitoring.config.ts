export interface MonitoringThresholds {
  successRateThreshold: number;
  errorRateThreshold: number;
  latencyThresholdMs: number;
}

export interface EngineMonitorConfig {
  engine: string;
  label: string;
  params: Record<string, unknown>;
  intervalHours: number;
  enabled: boolean;
}

export const DEFAULT_THRESHOLDS: MonitoringThresholds = {
  successRateThreshold: 80,
  errorRateThreshold: 30,
  latencyThresholdMs: 10000,
};

export const DEFAULT_ENGINE_CONFIGS: EngineMonitorConfig[] = [
  {
    engine: "google",
    label: "Google Search",
    params: { q: "coffee" },
    intervalHours: 1,
    enabled: true,
  },
  {
    engine: "google_shopping",
    label: "Google Shopping",
    params: { q: "laptop" },
    intervalHours: 1,
    enabled: true,
  },
  {
    engine: "google_news",
    label: "Google News",
    params: { q: "technology" },
    intervalHours: 1,
    enabled: true,
  },
  {
    engine: "youtube_video_transcript",
    label: "YouTube Transcript",
    params: { v: "dQw4w9WgXcQ" },
    intervalHours: 1,
    enabled: true,
  },
  {
    engine: "ebay",
    label: "eBay",
    params: { _nkw: "vintage camera" },
    intervalHours: 1,
    enabled: true,
  },
  {
    engine: "naver",
    label: "Naver",
    params: { query: "서울" },
    intervalHours: 1,
    enabled: true,
  },
];

export function getMonitoringConfig() {
  return {
    intervalHours: Number(process.env.MONITORING_INTERVAL_HOURS) || 1,
    enabled: process.env.MONITORING_ENABLED !== "false",
    thresholds: {
      successRateThreshold: Number(process.env.SUCCESS_RATE_THRESHOLD) || DEFAULT_THRESHOLDS.successRateThreshold,
      errorRateThreshold: Number(process.env.ERROR_RATE_THRESHOLD) || DEFAULT_THRESHOLDS.errorRateThreshold,
      latencyThresholdMs: Number(process.env.LATENCY_THRESHOLD_MS) || DEFAULT_THRESHOLDS.latencyThresholdMs,
    },
    engines: DEFAULT_ENGINE_CONFIGS,
  };
}
