import { describe, expect, it } from "vitest";
import {
  analysisOutputSchema,
  insightSchema,
  verifyEvidenceQuote
} from "@caselab/shared";

describe("evidence-first analysis guards", () => {
  it("accepts an exact evidence quote from its declared chunk", () => {
    expect(
      verifyEvidenceQuote({
        quote: "I cannot tell what I am paying for.",
        chunkText: "Participant 4: I cannot tell what I am paying for."
      })
    ).toEqual({ valid: true });
  });

  it("rejects a validated insight without evidence identifiers", () => {
    const result = insightSchema.safeParse({
      title: "Pricing is unclear",
      description: "Customers struggle with pricing.",
      status: "validated",
      confidence: "medium",
      evidenceIds: [],
      contradictionFlag: false,
      limitations: []
    });

    expect(result.success).toBe(false);
  });

  it("accepts provider output that links derived findings to local evidence IDs", () => {
    const result = analysisOutputSchema.safeParse({
      evidence: [
        {
          localId: "evidence-1",
          sourceChunkId: "f0cb8e72-4717-4e6a-92b9-915fa80bc125",
          quote: "I cannot tell what I am paying for.",
          category: "pain",
          claim: "Pricing is unclear to this participant."
        }
      ],
      themes: [
        {
          title: "Pricing clarity",
          description: "Participants describe uncertainty about pricing.",
          evidenceLocalIds: ["evidence-1"]
        }
      ],
      insights: [],
      hypotheses: [],
      researchGaps: []
    });

    expect(result.success).toBe(true);
  });
});
