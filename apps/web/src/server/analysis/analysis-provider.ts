import type { AnalysisOutput } from "@caselab/shared";

export type AnalysisInput = {
  objective: string;
  researchQuestions: string[];
  sourceChunks: Array<{ sourceId: string; sourceChunkId: string; content: string }>;
};

export type AnalysisUsage = {
  inputTokens?: number;
  outputTokens?: number;
};

export interface AnalysisProvider {
  analyze(input: AnalysisInput): Promise<{ output: AnalysisOutput; usage: AnalysisUsage }>;
}
