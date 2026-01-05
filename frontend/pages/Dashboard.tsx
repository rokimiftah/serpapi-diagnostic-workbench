import type { DiagnosticSummary } from "../../shared/types/index.ts";

import { useState } from "react";

import {
  DeepAnalysisCard,
  ParameterEditor,
  StatusBadge,
  TicketPreview,
  UpstreamCard,
  useFullDiagnostic,
  useTicketGenerate,
} from "../features/diagnostics";

const SUPPORTED_ENGINES = [
  { value: "google", label: "Google Search", example: '{\n  "q": "coffee"\n}' },
  { value: "google_shopping", label: "Google Shopping", example: '{\n  "q": "laptop"\n}' },
  { value: "google_news", label: "Google News", example: '{\n  "q": "technology"\n}' },
  { value: "youtube_video_transcript", label: "YouTube Transcript", example: '{\n  "v": "dQw4w9WgXcQ"\n}' },
  { value: "ebay", label: "eBay", example: '{\n  "_nkw": "vintage camera"\n}' },
  { value: "naver", label: "Naver", example: '{\n  "query": "서울 맛집"\n}' },
];

const DEFAULT_PARAMS = `{
  "q": "coffee"
}`;

function EngineSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {SUPPORTED_ENGINES.map((eng) => (
        <button
          key={eng.value}
          type="button"
          onClick={() => onChange(eng.value)}
          className={`cursor-pointer rounded-lg border-2 p-3 text-center transition-all ${
            value === eng.value
              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          <span className={`text-sm font-medium ${value === eng.value ? "text-blue-700" : "text-gray-700"}`}>{eng.label}</span>
        </button>
      ))}
    </div>
  );
}

function ResultsSummary({ result }: { result: DiagnosticSummary }) {
  const stats = [
    {
      label: "Upstream",
      value: result.upstream?.isBlocked ? "Blocked" : "OK",
      color: result.upstream?.isBlocked ? "text-red-600" : "text-green-600",
    },
    {
      label: "HTML Fetched",
      value: result.deepAnalysis?.htmlComparison?.htmlFetched ? "YES" : "NO",
      color: result.deepAnalysis?.htmlComparison?.htmlFetched ? "text-green-600" : "text-gray-400",
    },
    {
      label: "Sections in HTML",
      value: result.deepAnalysis?.totalSectionsInHtml ?? "--",
      color: "text-gray-900",
    },
    {
      label: "Missing in JSON",
      value: result.deepAnalysis?.totalMissing ?? 0,
      color:
        (result.deepAnalysis?.criticalMissing ?? 0) > 0
          ? "text-red-600"
          : (result.deepAnalysis?.totalMissing ?? 0) > 0
            ? "text-yellow-600"
            : "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg bg-gray-50 p-3 text-center">
          <div className="text-xs tracking-wide text-gray-500 uppercase">{stat.label}</div>
          <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
        </div>
      ))}
    </div>
  );
}

export function Dashboard() {
  const [apiKey, setApiKey] = useState("");
  const [engine, setEngine] = useState("google");
  const [paramsJson, setParamsJson] = useState(DEFAULT_PARAMS);
  const [paramsError, setParamsError] = useState<string>();
  const [isGeneratingTicket, setIsGeneratingTicket] = useState(false);

  const [result, setResult] = useState<DiagnosticSummary | null>(null);

  const fullDiagnostic = useFullDiagnostic();
  const ticketGenerate = useTicketGenerate();

  const handleEngineChange = (newEngine: string) => {
    setEngine(newEngine);
    const selectedEngine = SUPPORTED_ENGINES.find((e) => e.value === newEngine);
    if (selectedEngine?.example) {
      setParamsJson(selectedEngine.example);
    }
  };

  const handleRunDiagnostic = async () => {
    setParamsError(undefined);
    setResult(null);
    ticketGenerate.reset();

    if (!apiKey.trim()) {
      setParamsError("API key is required");
      return;
    }

    let params: Record<string, unknown>;
    try {
      params = JSON.parse(paramsJson);
    } catch {
      setParamsError("Invalid JSON format");
      return;
    }

    try {
      const data = await fullDiagnostic.mutateAsync({
        params,
        engine,
        apiKey,
        runUpstream: true,
        runDeepAnalysis: true,
      });
      setResult(data);
    } catch (error) {
      setParamsError(error instanceof Error ? error.message : "Diagnostic failed");
    }
  };

  const handleGenerateTicket = async () => {
    if (!result || isGeneratingTicket) return;

    let params: Record<string, unknown>;
    try {
      params = JSON.parse(paramsJson);
    } catch {
      return;
    }

    setIsGeneratingTicket(true);

    try {
      const minLoadingTime = new Promise((resolve) => setTimeout(resolve, 500));

      await Promise.all([
        ticketGenerate.mutateAsync({
          summary: result,
          params: { ...params, engine },
        }),
        minLoadingTime,
      ]);

      setTimeout(() => {
        document.getElementById("ticket-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } finally {
      setIsGeneratingTicket(false);
    }
  };

  const selectedEngine = SUPPORTED_ENGINES.find((e) => e.value === engine);

  return (
    <main className="mx-auto max-w-7xl overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6 md:px-6">
      {/* Page Header */}
      <div className="mb-4 flex flex-col items-center gap-3 sm:mb-6 sm:flex-row sm:justify-between">
        <div className="text-center sm:text-left">
          <h2 className="text-lg font-bold text-gray-900 sm:text-xl">Run Diagnostic</h2>
          <p className="text-xs text-gray-500 sm:text-sm">Compare HTML source with SerpApi JSON response</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-2 py-1 sm:px-3 sm:py-1.5">
          <span className="text-xs text-gray-500">Engine:</span>
          <span className="text-xs font-medium text-gray-700 sm:text-sm">{selectedEngine?.label}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* Configuration Panel */}
        <div className="space-y-4">
          {/* API Key Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">API Key</h2>
            <div className="relative">
              <input
                id="api-key-input"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your SerpApi key"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>
            <p className="mt-2 text-xs text-gray-400">Your key is never stored - session only</p>
          </div>

          {/* Engine Selection Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Search Engine</h2>
            <EngineSelector value={engine} onChange={handleEngineChange} />
          </div>

          {/* Parameters Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Parameters</h2>
            <ParameterEditor value={paramsJson} onChange={setParamsJson} error={paramsError} />
          </div>

          {/* Run Button */}
          <button
            type="button"
            onClick={handleRunDiagnostic}
            disabled={fullDiagnostic.isPending || !apiKey.trim()}
            className="w-full cursor-pointer rounded-xl bg-blue-600 py-4 font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {fullDiagnostic.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Running Diagnostic...
              </span>
            ) : (
              "Run Diagnostic"
            )}
          </button>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {/* Loading State */}
          {fullDiagnostic.isPending && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-16">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <p className="mt-4 text-lg font-medium text-gray-600">Running diagnostic...</p>
              <p className="mt-1 text-sm text-gray-400">Fetching HTML and comparing with JSON response</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <>
              {/* Results Header */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900">Diagnostic Results</h2>
                      <StatusBadge status={result.overallStatus} size="lg" />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{new Date(result.timestamp).toLocaleString()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateTicket}
                    disabled={isGeneratingTicket}
                    className="min-w-35 cursor-pointer rounded-lg bg-gray-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isGeneratingTicket ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Generating...</span>
                      </span>
                    ) : (
                      <span>Generate Ticket</span>
                    )}
                  </button>
                </div>

                {/* Quick Stats */}
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <ResultsSummary result={result} />
                </div>
              </div>

              {/* Detail Cards */}
              <div className="space-y-4">
                {result.deepAnalysis && <DeepAnalysisCard report={result.deepAnalysis} />}
                {result.upstream && <UpstreamCard report={result.upstream} />}
                {ticketGenerate.data && (
                  <div id="ticket-preview">
                    <TicketPreview ticket={ticketGenerate.data} />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Empty State */}
          {!fullDiagnostic.isPending && !result && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white p-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <p className="mt-4 text-xl font-medium text-gray-600">No Results Yet</p>
              <p className="mt-2 max-w-sm text-center text-sm text-gray-400">
                Enter your API key, select an engine, and click "Run Diagnostic" to compare HTML with JSON
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
