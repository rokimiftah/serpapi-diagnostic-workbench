import type { DiagnosticStatus } from "../../../../shared/types/index.ts";

interface StatusBadgeProps {
  status: DiagnosticStatus;
  size?: "sm" | "md" | "lg";
}

const statusConfig: Record<DiagnosticStatus, { bg: string; text: string; label: string }> = {
  STABLE: { bg: "bg-green-100", text: "text-green-800", label: "Stable" },
  FLAKY: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Flaky" },
  PARSER_FAIL: { bg: "bg-red-100", text: "text-red-800", label: "Parser Fail" },
  UPSTREAM_BLOCK: { bg: "bg-gray-900", text: "text-white", label: "Upstream Block" },
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
  lg: "px-3 py-1.5 text-base",
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses[size]}`}>
      {config.label}
    </span>
  );
}
