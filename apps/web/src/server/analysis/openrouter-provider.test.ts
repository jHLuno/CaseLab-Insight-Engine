import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenRouterAnalysisProvider } from "./openrouter-provider";

const analysisInput = {
  objective: "Understand why people delay a purchase.",
  researchQuestions: ["What creates hesitation?"],
  sourceChunks: [
    {
      sourceId: "11111111-1111-4111-8111-111111111111",
      sourceChunkId: "22222222-2222-4222-8222-222222222222",
      content: "I delay buying because the price feels risky."
    }
  ]
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("OpenRouterAnalysisProvider", () => {
  it("uses the configured Gemini model and strict JSON schema", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("ANALYSIS_MODEL", "google/gemini-2.5-flash-lite");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  evidence: [],
                  themes: [],
                  insights: [],
                  hypotheses: [],
                  researchGaps: [
                    {
                      question: "What would make the price feel less risky?",
                      reason: "The source describes a concern but not a solution.",
                      suggestedNextQuestions: ["What information would reduce risk?"]
                    }
                  ]
                })
              }
            }
          ],
          usage: { completion_tokens: 12, prompt_tokens: 34 }
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await new OpenRouterAnalysisProvider().analyze(analysisInput);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
        method: "POST"
      })
    );
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.model).toBe("google/gemini-2.5-flash-lite");
    expect(body.response_format.json_schema.strict).toBe(true);
  });

  it("returns a safe error for malformed provider output", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }] }), {
          status: 200
        })
      )
    );

    await expect(new OpenRouterAnalysisProvider().analyze(analysisInput)).rejects.toThrow(
      "Analysis provider returned an invalid response."
    );
  });
});
