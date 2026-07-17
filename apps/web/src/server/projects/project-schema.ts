import { z } from "zod";

const researchQuestionSchema = z.string().trim().min(1).max(2000);

export const projectInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).optional().default(""),
  researchObjective: z
    .string()
    .trim()
    .min(1, "A research objective is required.")
    .max(4000),
  researchQuestions: z.array(researchQuestionSchema).max(20).default([])
});

export type ProjectInput = z.input<typeof projectInputSchema>;
