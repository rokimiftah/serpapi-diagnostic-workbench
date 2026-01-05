import type { DiagnosticSummary, TicketTemplate, UpstreamReport } from "../../../../shared/types/index.ts";

import { useMutation } from "@tanstack/react-query";

import { diagnosticsClient } from "../services/diagnosticsApi";

interface UpstreamAnalyzeInput {
  rawHtmlUrl?: string;
  params?: Record<string, unknown>;
  apiKey?: string;
}

interface TicketGenerateInput {
  summary: DiagnosticSummary;
  params: Record<string, unknown>;
}

interface FullDiagnosticInput {
  params: Record<string, unknown>;
  engine: string;
  apiKey: string;
  runUpstream?: boolean;
  runDeepAnalysis?: boolean;
}

export function useUpstreamAnalyze() {
  return useMutation({
    mutationFn: async (input: UpstreamAnalyzeInput) => {
      const response = await diagnosticsClient.upstream.analyze.$post({
        json: input,
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error("error" in data ? String(data.error) : "Failed to analyze upstream");
      }
      return data.data as UpstreamReport;
    },
  });
}

export function useTicketGenerate() {
  return useMutation({
    mutationFn: async (input: TicketGenerateInput) => {
      const response = await diagnosticsClient.ticket.generate.$post({
        json: input,
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error("error" in data ? String(data.error) : "Failed to generate ticket");
      }
      return data.data as TicketTemplate;
    },
  });
}

export function useFullDiagnostic() {
  return useMutation({
    mutationFn: async (input: FullDiagnosticInput) => {
      const response = await diagnosticsClient.full.$post({
        json: {
          params: input.params,
          engine: input.engine,
          apiKey: input.apiKey,
          runUpstream: input.runUpstream ?? true,
          runDeepAnalysis: input.runDeepAnalysis ?? true,
        },
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error("error" in data ? String(data.error) : "Failed to run diagnostic");
      }
      return data.data as DiagnosticSummary;
    },
  });
}
