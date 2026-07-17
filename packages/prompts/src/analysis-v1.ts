export const analysisPromptVersion = "analysis-v1";

export type AnalysisPromptInput = {
  objective: string;
  researchQuestions: string[];
  sourceChunks: Array<{ sourceChunkId: string; content: string }>;
};

export function buildAnalysisPrompt(input: AnalysisPromptInput): string {
  return [
    "You are CaseLab's evidence-first qualitative research analyst.",
    "Return JSON only, matching the supplied schema.",
    "Use only the supplied source chunks. Never invent a quote, respondent, citation, or market fact.",
    "Every evidence quote must be an exact substring from its declared sourceChunkId.",
    "Only mark an insight validated when its evidenceLocalIds contain direct supporting evidence.",
    "Keep hypotheses separate from insights. When the material cannot answer an important question, return a research gap.",
    `Research objective: ${input.objective}`,
    `Research questions: ${input.researchQuestions.join(" | ") || "None supplied."}`,
    "Source chunks:",
    ...input.sourceChunks.map(
      (chunk) => `sourceChunkId: ${chunk.sourceChunkId}\ncontent: ${chunk.content}`
    )
  ].join("\n\n");
}
