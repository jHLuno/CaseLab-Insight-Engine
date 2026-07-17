import { z } from "zod";

export const analysisStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "invalidated"
]);

export const evidenceCategorySchema = z.enum([
  "pain",
  "need",
  "motivation",
  "objection",
  "desire",
  "language_pattern",
  "other"
]);

export const sourceInputTypeSchema = z.enum(["pasted_text", "text_upload"]);

export type AnalysisStatus = z.infer<typeof analysisStatusSchema>;
export type EvidenceCategory = z.infer<typeof evidenceCategorySchema>;
export type SourceInputType = z.infer<typeof sourceInputTypeSchema>;
