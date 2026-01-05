import type { UpstreamReport } from "../../../../shared/types/index.ts";

import { StatusBadge } from "./StatusBadge";

interface UpstreamCardProps {
  report: UpstreamReport;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UpstreamCard({ report }: UpstreamCardProps) {
  const foundPatterns = report.blockPatterns.filter((p) => p.found);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Upstream Analysis</h3>
        <StatusBadge status={report.status} />
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-sm text-gray-500">Content Type</p>
          <p className="text-lg font-bold text-gray-900 uppercase">{report.contentType}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-sm text-gray-500">HTML Size</p>
          <p className="text-lg font-bold text-gray-900">{formatBytes(report.htmlSize)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-sm text-gray-500">Blocked</p>
          <p className={`text-lg font-bold ${report.isBlocked ? "text-red-600" : "text-green-600"}`}>
            {report.isBlocked ? "Yes" : "No"}
          </p>
        </div>
      </div>

      {report.alertMessage && (
        <div className={`mb-4 rounded-lg p-4 ${report.isBlocked ? "bg-red-50" : "bg-yellow-50"}`}>
          <p className={`text-sm font-medium ${report.isBlocked ? "text-red-800" : "text-yellow-800"}`}>{report.alertMessage}</p>
        </div>
      )}

      {foundPatterns.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Blocking Patterns Found</p>
          <ul className="space-y-2">
            {foundPatterns.map((pattern) => (
              <li key={pattern.pattern} className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-800">{pattern.pattern}</p>
                {pattern.context && <p className="mt-1 truncate font-mono text-xs text-red-600">{pattern.context}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!report.isBlocked && foundPatterns.length === 0 && (
        <div className="rounded-lg bg-green-50 p-4 text-center">
          <p className="text-sm text-green-700">No blocking patterns detected</p>
        </div>
      )}
    </div>
  );
}
