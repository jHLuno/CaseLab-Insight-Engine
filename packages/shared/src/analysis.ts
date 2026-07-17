import { z } from "zod";

export const insightStatusSchema = z.enum([
  "validated",
  "emerging",
  "hypothesis",
  "needs_more_research"
]);

export const confidenceSchema = z.enum(["high", "medium", "low", "unknown"]);

export const insightSchema = z
  .object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    status: insightStatusSchema,
    confidence: confidenceSchema,
    evidenceIds: z.array(z.string().uuid()),
    contradictionFlag: z.boolean(),
    limitations: z.array(z.string().trim().min(1))
  })
  .superRefine((insight, context) => {
    if (insight.status === "validated" && insight.evidenceIds.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Validated insights require at least one evidence identifier.",
        path: ["evidenceIds"]
      });
    }
  });

export type Insight = z.infer<typeof insightSchema>;

export function verifyEvidenceQuote(input: {
  quote: string;
  chunkText: string;
}): { valid: true } | { valid: false; reason: "empty_quote" | "quote_not_found" } {
  const quote = input.quote.trim();

  if (quote.length === 0) {
    return { valid: false, reason: "empty_quote" };
  }

  if (!input.chunkText.includes(quote)) {
    return { valid: false, reason: "quote_not_found" };
  }

  return { valid: true };
}
