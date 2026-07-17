import type { Json } from "@/server/database/types";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { AnalysisUsage } from "./analysis-provider";
import { analysisRunIdSchema } from "./run-service";
import type { VerifiedAnalysisOutput } from "./verify-output";

export async function persistVerifiedOutput(
  runId: string,
  output: VerifiedAnalysisOutput,
  usage: AnalysisUsage
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("persist_verified_analysis_output", {
    input_run_id: analysisRunIdSchema.parse(runId),
    input_output: output as unknown as Json,
    input_usage: {
      input_tokens: usage.inputTokens ?? null,
      output_tokens: usage.outputTokens ?? null
    }
  });

  if (error) {
    throw new Error("Unable to save verified analysis output.");
  }
}
