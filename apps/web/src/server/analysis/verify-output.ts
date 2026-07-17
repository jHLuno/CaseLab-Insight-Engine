import {
  analysisOutputSchema,
  verifyEvidenceQuote,
  type AnalysisOutput
} from "@caselab/shared";
import type { AnalysisInput } from "./analysis-provider";

export type VerifiedEvidence = AnalysisOutput["evidence"][number] & {
  sourceId: string;
};

export type VerifiedAnalysisOutput = Omit<AnalysisOutput, "evidence"> & {
  evidence: VerifiedEvidence[];
};

export function verifyAnalysisOutput(
  output: AnalysisOutput,
  chunks: AnalysisInput["sourceChunks"]
): VerifiedAnalysisOutput {
  const parsedOutput = analysisOutputSchema.parse(output);
  const chunksById = new Map(chunks.map((chunk) => [chunk.sourceChunkId, chunk]));
  const evidenceIds = new Set<string>();
  const evidence = parsedOutput.evidence.map((item) => {
    if (evidenceIds.has(item.localId)) {
      throw new Error("duplicate_evidence_id");
    }
    evidenceIds.add(item.localId);

    const chunk = chunksById.get(item.sourceChunkId);
    if (!chunk) {
      throw new Error("unknown_source_chunk");
    }

    const quoteCheck = verifyEvidenceQuote({ chunkText: chunk.content, quote: item.quote });
    if (!quoteCheck.valid) {
      throw new Error(quoteCheck.reason);
    }

    return { ...item, sourceId: chunk.sourceId };
  });

  for (const theme of parsedOutput.themes) {
    assertKnownEvidenceReferences(theme.evidenceLocalIds, evidenceIds);
  }
  for (const hypothesis of parsedOutput.hypotheses) {
    assertKnownEvidenceReferences(hypothesis.evidenceLocalIds, evidenceIds);
  }
  for (const insight of parsedOutput.insights) {
    assertKnownEvidenceReferences(insight.evidenceLocalIds, evidenceIds);
    if (insight.status === "validated" && insight.evidenceLocalIds.length === 0) {
      throw new Error("validated_insight_without_evidence");
    }
  }

  return { ...parsedOutput, evidence };
}

function assertKnownEvidenceReferences(ids: string[], evidenceIds: Set<string>): void {
  for (const id of ids) {
    if (!evidenceIds.has(id)) {
      throw new Error("missing_evidence_reference");
    }
  }
}
