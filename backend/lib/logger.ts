import { config } from "../config/index.ts";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",

  // Levels
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m", // green
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red

  // Elements
  timestamp: "\x1b[90m", // gray
  method: "\x1b[35m", // magenta
  path: "\x1b[36m", // cyan
  status: {
    success: "\x1b[32m", // green
    redirect: "\x1b[33m", // yellow
    clientError: "\x1b[33m", // yellow
    serverError: "\x1b[31m", // red
  },
  duration: "\x1b[33m", // yellow
};

function getStatusColor(status: number): string {
  if (status >= 500) return colors.status.serverError;
  if (status >= 400) return colors.status.clientError;
  if (status >= 300) return colors.status.redirect;
  return colors.status.success;
}

function formatTimestamp(): string {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, "0");
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function levelIcon(level: LogLevel): string {
  switch (level) {
    case "debug":
      return "●";
    case "info":
      return "●";
    case "warn":
      return "▲";
    case "error":
      return "✖";
  }
}

function formatLog(entry: LogEntry): string {
  const { level, message, timestamp, data } = entry;
  const color = colors[level];
  const icon = levelIcon(level);

  let output = `${colors.timestamp}${timestamp}${colors.reset} ${color}${icon} ${level.toUpperCase()}${colors.reset} ${message}`;

  if (data && Object.keys(data).length > 0) {
    if (config.isDev) {
      output += `\n${colors.dim}${JSON.stringify(data, null, 2)}${colors.reset}`;
    } else {
      output += ` ${colors.dim}${JSON.stringify(data)}${colors.reset}`;
    }
  }

  return output;
}

function createLogger() {
  const log = (level: LogLevel, message: string, data?: Record<string, unknown>) => {
    const entry: LogEntry = {
      level,
      message,
      timestamp: formatTimestamp(),
      data,
    };

    const formatted = formatLog(entry);

    switch (level) {
      case "error":
        console.error(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  };

  return {
    debug: (message: string, data?: Record<string, unknown>) => {
      if (config.isDev) log("debug", message, data);
    },
    info: (message: string, data?: Record<string, unknown>) => log("info", message, data),
    warn: (message: string, data?: Record<string, unknown>) => log("warn", message, data),
    error: (message: string, data?: Record<string, unknown>) => log("error", message, data),

    // Special method for HTTP requests
    http: (method: string, path: string, status: number, duration: number, extra?: Record<string, unknown>) => {
      const statusColor = getStatusColor(status);
      const durationStr = formatDuration(duration);
      const durationColor = duration > 1000 ? colors.error : duration > 500 ? colors.warn : colors.dim;

      const message = [
        `${colors.method}${method}${colors.reset}`,
        `${colors.path}${path}${colors.reset}`,
        `${statusColor}${status}${colors.reset}`,
        `${durationColor}${durationStr}${colors.reset}`,
      ].join(" ");

      const level: LogLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
      log(level, message, extra);
    },
  };
}

export const log = createLogger();
