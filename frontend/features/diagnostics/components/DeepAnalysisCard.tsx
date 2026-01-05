import type { DeepAnalysisReport } from "../../../../shared/types/index.ts";

import { useState } from "react";

interface DeepAnalysisCardProps {
  report: DeepAnalysisReport;
}

function SeverityBadge({ severity }: { severity: "critical" | "warning" | "info" }) {
  const colors = {
    critical: "bg-red-100 text-red-700",
    warning: "bg-yellow-100 text-yellow-700",
    info: "bg-blue-100 text-blue-700",
  };

  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[severity]}`}>{severity.toUpperCase()}</span>;
}

export function DeepAnalysisCard({ report }: DeepAnalysisCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const { htmlComparison } = report;
  const hasMissing = report.totalMissing > 0;
  const hasCritical = report.criticalMissing > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-100 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Deep Analysis</h3>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">HTML vs JSON</span>
            {hasCritical && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {report.criticalMissing} Critical Missing
              </span>
            )}
            {hasMissing && !hasCritical && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                {report.totalMissing} Missing
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="cursor-pointer text-sm text-blue-600 hover:text-blue-700"
          >
            {showDetails ? "Hide Details" : "Show Details"}
          </button>
        </div>
        <p className={`mt-2 text-sm ${hasCritical ? "text-red-600" : hasMissing ? "text-yellow-600" : "text-green-600"}`}>
          {htmlComparison.summary}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <p className="text-xs text-gray-500">HTML Fetched</p>
          <p className={`text-2xl font-bold ${htmlComparison.htmlFetched ? "text-green-600" : "text-gray-400"}`}>
            {htmlComparison.htmlFetched ? "YES" : "NO"}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <p className="text-xs text-gray-500">In HTML</p>
          <p className="text-2xl font-bold text-gray-900">{report.totalSectionsInHtml}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <p className="text-xs text-gray-500">In JSON</p>
          <p className="text-2xl font-bold text-gray-900">{report.totalSectionsInJson}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <p className="text-xs text-gray-500">Missing</p>
          <p className={`text-2xl font-bold ${hasCritical ? "text-red-600" : hasMissing ? "text-yellow-600" : "text-green-600"}`}>
            {report.totalMissing}
          </p>
        </div>
      </div>

      {/* Suggested Ticket */}
      {report.suggestedTicketTitle && (
        <div className="border-t border-gray-100 px-5 py-4">
          <p className="mb-2 text-sm font-medium text-gray-700">Suggested Ticket Title</p>
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3">
            <code className="flex-1 text-sm text-red-800">{report.suggestedTicketTitle}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(report.suggestedTicketTitle || "")}
              className="cursor-pointer rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Details Section */}
      {showDetails && htmlComparison.htmlFetched && (
        <div className="border-t border-gray-100 p-5">
          <div className="space-y-4">
            {/* HTML Size */}
            {htmlComparison.htmlSize && (
              <p className="text-xs text-gray-500">
                HTML Size: {Math.round(htmlComparison.htmlSize / 1024)}KB
                {htmlComparison.htmlUrl && (
                  <>
                    {" | "}
                    <a
                      href={htmlComparison.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Raw HTML
                    </a>
                  </>
                )}
              </p>
            )}

            {/* Side by Side Comparison */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Found in HTML */}
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Found in HTML</p>
                <div className="space-y-1">
                  {htmlComparison.sectionsInHtml.length > 0 ? (
                    htmlComparison.sectionsInHtml.map((s) => (
                      <div key={s.name} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm">
                        <span className="text-gray-900">{s.name}</span>
                        <span className="text-gray-500">{s.count} items</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">No sections detected in HTML</p>
                  )}
                </div>
              </div>

              {/* Found in JSON */}
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Found in JSON</p>
                <div className="space-y-1">
                  {htmlComparison.sectionsInJson.length > 0 ? (
                    htmlComparison.sectionsInJson.map((s) => (
                      <div key={s} className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
                        {s}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">No sections in JSON</p>
                  )}
                </div>
              </div>
            </div>

            {/* Missing in JSON - THE IMPORTANT PART */}
            {hasMissing && (
              <div>
                <p className="mb-2 text-sm font-medium text-red-700">Missing in JSON (Parsing Bug!)</p>
                <div className="space-y-2">
                  {htmlComparison.missingInJson.map((m) => (
                    <div
                      key={m.section}
                      className={`rounded-lg p-3 ${
                        m.severity === "critical" ? "bg-red-50" : m.severity === "warning" ? "bg-yellow-50" : "bg-blue-50"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <SeverityBadge severity={m.severity} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{m.section}</p>
                          <p className="text-xs text-gray-600">{m.description}</p>
                          <p className="mt-1 text-xs text-gray-400">{m.htmlEvidence}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Not fetched message */}
      {showDetails && !htmlComparison.htmlFetched && (
        <div className="border-t border-gray-100 p-5">
          <p className="text-sm text-gray-500">{htmlComparison.summary}</p>
        </div>
      )}
    </div>
  );
}
