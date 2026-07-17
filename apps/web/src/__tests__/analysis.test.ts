import { describe, expect, it } from "vitest";
import { insightSchema, verifyEvidenceQuote } from "@caselab/shared";

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
});
