import { z } from "zod";
import { confidenceSchema, insightStatusSchema } from "./analysis";
import { evidenceCategorySchema } from "./domain";

const localIdSchema = z.string().trim().min(1).max(128);
const evidenceLocalIdsSchema = z.array(localIdSchema).min(1);

export const analysisEvidenceSchema = z.object({
  localId: localIdSchema,
  sourceChunkId: z.string().uuid(),
  quote: z.string().trim().min(1),
  category: evidenceCategorySchema,
  claim: z.string().trim().min(1),
  speakerLabel: z.string().trim().min(1).nullable().optional()
});

export const analysisThemeSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  evidenceLocalIds: evidenceLocalIdsSchema
});

export const analysisInsightSchema = z
  .object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    status: insightStatusSchema,
    confidence: confidenceSchema,
    evidenceLocalIds: z.array(localIdSchema),
    contradictionFlag: z.boolean(),
    limitations: z.array(z.string().trim().min(1))
  })
  .superRefine((insight, context) => {
    if (insight.status === "validated" && insight.evidenceLocalIds.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Validated insights require at least one evidence reference.",
        path: ["evidenceLocalIds"]
      });
    }
  });

export const analysisHypothesisSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  evidenceLocalIds: z.array(localIdSchema),
  suggestedValidation: z.string().trim().min(1)
});

export const researchGapSchema = z.object({
  question: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  suggestedNextQuestions: z.array(z.string().trim().min(1)).min(1)
});

export const analysisOutputSchema = z.object({
  evidence: z.array(analysisEvidenceSchema),
  themes: z.array(analysisThemeSchema),
  insights: z.array(analysisInsightSchema),
  hypotheses: z.array(analysisHypothesisSchema),
  researchGaps: z.array(researchGapSchema)
});

export type AnalysisOutput = z.infer<typeof analysisOutputSchema>;
