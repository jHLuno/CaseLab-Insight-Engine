import { analysisOutputSchema, type AnalysisOutput } from "@caselab/shared";
import { buildAnalysisPrompt } from "@caselab/prompts";
import type { AnalysisInput, AnalysisProvider, AnalysisUsage } from "./analysis-provider";

const openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";
const defaultAnalysisModel = "google/gemini-2.5-flash-lite";

const analysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["evidence", "themes", "insights", "hypotheses", "researchGaps"],
  properties: {
    evidence: { type: "array" },
    themes: { type: "array" },
    insights: { type: "array" },
    hypotheses: { type: "array" },
    researchGaps: { type: "array" }
  }
} as const;

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { completion_tokens?: number; prompt_tokens?: number };
};

export class OpenRouterAnalysisProvider implements AnalysisProvider {
  async analyze(input: AnalysisInput): Promise<{ output: AnalysisOutput; usage: AnalysisUsage }> {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error("Analysis provider is not configured.");
    }

    let response: Response;
    try {
      response = await fetch(openRouterUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.ANALYSIS_MODEL || defaultAnalysisModel,
          temperature: 0,
          stream: false,
          messages: [
            {
              role: "user",
              content: buildAnalysisPrompt(input)
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "caselab_analysis",
              strict: true,
              schema: analysisJsonSchema
            }
          }
        }),
        signal: AbortSignal.timeout(60_000)
      });
    } catch {
      throw new Error("Analysis provider is temporarily unavailable.");
    }

    if (!response.ok) {
      throw new Error("Analysis provider is temporarily unavailable.");
    }

    let payload: OpenRouterResponse;
    try {
      payload = (await response.json()) as OpenRouterResponse;
    } catch {
      throw new Error("Analysis provider returned an invalid response.");
    }

    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("Analysis provider returned an invalid response.");
    }

    let output: AnalysisOutput;
    try {
      output = analysisOutputSchema.parse(JSON.parse(content));
    } catch {
      throw new Error("Analysis provider returned an invalid response.");
    }

    return {
      output,
      usage: {
        inputTokens: payload.usage?.prompt_tokens,
        outputTokens: payload.usage?.completion_tokens
      }
    };
  }
}
