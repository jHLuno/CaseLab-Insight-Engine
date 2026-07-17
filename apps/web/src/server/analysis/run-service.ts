import { analysisPromptVersion } from "@caselab/prompts";
import { z } from "zod";
import type { Database, Json } from "@/server/database/types";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createServerSupabaseClient } from "@/server/supabase/server";
import type { AnalysisInput } from "./analysis-provider";

export const projectIdSchema = z.string().uuid();
export const analysisRunIdSchema = z.string().uuid();

export const defaultAnalysisModel = "google/gemini-2.5-flash-lite";

export function configuredAnalysisModel(): string {
  return process.env.ANALYSIS_MODEL?.trim() || defaultAnalysisModel;
}

export async function queueAnalysisRun(
  projectId: string
): Promise<Pick<Database["public"]["Tables"]["analysis_runs"]["Row"], "id" | "status">> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("queue_analysis_run", {
    input_model: configuredAnalysisModel(),
    input_project_id: projectIdSchema.parse(projectId),
    input_prompt_version: analysisPromptVersion
  });

  if (error || !data) {
    throw new Error("Analysis requires a research objective and at least one source.");
  }

  return { id: data.id, status: data.status };
}

export async function retryAnalysisRun(
  runId: string
): Promise<Pick<Database["public"]["Tables"]["analysis_runs"]["Row"], "id" | "status">> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("retry_analysis_run", {
    input_run_id: analysisRunIdSchema.parse(runId)
  });

  if (error || !data) {
    throw new Error("This analysis run cannot be retried.");
  }

  return { id: data.id, status: data.status };
}

export async function loadAnalysisInput(runId: string): Promise<AnalysisInput> {
  const admin = createSupabaseAdminClient();
  const { data: run, error: runError } = await admin
    .from("analysis_runs")
    .select("id, objective_snapshot, research_questions_snapshot, source_ids, status")
    .eq("id", analysisRunIdSchema.parse(runId))
    .maybeSingle();

  if (runError || !run || run.status !== "running") {
    throw new Error("Analysis input is no longer available.");
  }

  const { data: chunks, error: chunksError } = await admin
    .from("source_chunks")
    .select("id, source_id, content, chunk_index")
    .in("source_id", run.source_ids)
    .order("source_id")
    .order("chunk_index");

  if (chunksError || !chunks || new Set(chunks.map((chunk) => chunk.source_id)).size !== run.source_ids.length) {
    throw new Error("Analysis input is no longer available.");
  }

  return {
    objective: run.objective_snapshot,
    researchQuestions: readResearchQuestions(run.research_questions_snapshot),
    sourceChunks: chunks.map((chunk) => ({
      sourceId: chunk.source_id,
      sourceChunkId: chunk.id,
      content: chunk.content
    }))
  };
}

export async function setAnalysisRunState(
  runId: string,
  state: "running" | "failed",
  safeErrorCode: string | null = null
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("analysis_runs")
    .update({ safe_error_code: safeErrorCode, status: state })
    .eq("id", analysisRunIdSchema.parse(runId));

  if (error) {
    throw new Error("Unable to update analysis status.");
  }
}

function readResearchQuestions(value: Json): string[] {
  return Array.isArray(value)
    ? value.filter((question): question is string => typeof question === "string")
    : [];
}
