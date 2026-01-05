export type DiagnosticStatus = "STABLE" | "FLAKY" | "PARSER_FAIL" | "UPSTREAM_BLOCK";

export type DiagnosticType = "upstream" | "deep_analysis";

// Upstream Analysis Types

export interface BlockPattern {
  pattern: string;
  found: boolean;
  context?: string;
}

export interface UpstreamReport {
  rawHtmlUrl: string;
  contentType: "html" | "json" | "unknown";
  isBlocked: boolean;
  blockPatterns: BlockPattern[];
  htmlSize: number;
  status: DiagnosticStatus;
  alertMessage?: string;
}

// Deep Analysis Types - HTML vs JSON comparison

export interface HtmlSection {
  name: string;
  count: number;
  selector: string;
}

export interface MissingSection {
  section: string;
  description: string;
  severity: "critical" | "warning" | "info";
  htmlEvidence: string;
  htmlCount: number;
}

export interface HtmlComparisonResult {
  htmlFetched: boolean;
  htmlUrl?: string;
  htmlSize?: number;
  sectionsInHtml: HtmlSection[];
  sectionsInJson: string[];
  missingInJson: MissingSection[];
  summary: string;
}

export interface DeepAnalysisReport {
  engine: string;
  timestamp: string;

  // HTML Comparison (the core feature)
  htmlComparison: HtmlComparisonResult;

  // Quick stats
  totalSectionsInHtml: number;
  totalSectionsInJson: number;
  totalMissing: number;
  criticalMissing: number;

  // Overall assessment
  hasCriticalIssues: boolean;
  suggestedTicketTitle?: string;
}

// Summary

export interface DiagnosticSummary {
  upstream?: UpstreamReport;
  deepAnalysis?: DeepAnalysisReport;
  overallStatus: DiagnosticStatus;
  timestamp: string;
}

export interface TicketTemplate {
  title: string;
  body: string;
  labels: string[];
}
