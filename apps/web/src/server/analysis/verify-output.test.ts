import { describe, expect, it } from "vitest";
import type { AnalysisOutput } from "@caselab/shared";
import { verifyAnalysisOutput } from "./verify-output";

const sourceId = "11111111-1111-4111-8111-111111111111";
const sourceChunkId = "22222222-2222-4222-8222-222222222222";
const chunks = [
  {
    sourceId,
    sourceChunkId,
    content: "I delay buying because the price feels risky."
  }
];

function outputWithEvidence(quote: string): AnalysisOutput {
  return {
    evidence: [
      {
        localId: "evidence-1",
        sourceChunkId,
        quote,
        category: "objection",
        claim: "Price risk delays purchase."
      }
    ],
    themes: [],
    insights: [
      {
        title: "Price risk delays purchase",
        description: "The participant describes price as risky.",
        status: "validated",
        confidence: "low",
        evidenceLocalIds: ["evidence-1"],
        contradictionFlag: false,
        limitations: ["One source only."]
      }
    ],
    hypotheses: [],
    researchGaps: []
  };
}

describe("verifyAnalysisOutput", () => {
  it("rejects an evidence quote absent from its declared chunk", () => {
    expect(() => verifyAnalysisOutput(outputWithEvidence("Invented customer quote."), chunks)).toThrow(
      "quote_not_found"
    );
  });

  it("rejects a validated insight that references rejected evidence", () => {
    const output = outputWithEvidence("I delay buying because the price feels risky.");
    output.insights[0]!.evidenceLocalIds = ["unknown-evidence"];

    expect(() => verifyAnalysisOutput(output, chunks)).toThrow("missing_evidence_reference");
  });

  it("keeps a gap-only result when evidence is insufficient", () => {
    const result = verifyAnalysisOutput(
      {
        evidence: [],
        themes: [],
        insights: [],
        hypotheses: [],
        researchGaps: [
          {
            question: "What would reduce the perceived price risk?",
            reason: "The source names risk but not what would resolve it.",
            suggestedNextQuestions: ["What information would make the decision safer?"]
          }
        ]
      },
      chunks
    );

    expect(result.researchGaps).toHaveLength(1);
  });
});
