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

export async function setAnalysisTriggerRunId(runId: string, triggerRunId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("analysis_runs")
    .update({ trigger_run_id: triggerRunId })
    .eq("id", analysisRunIdSchema.parse(runId));

  if (error) {
    throw new Error("Unable to record analysis task.");
  }
}

export type LatestAnalysisRun = {
  id: string;
  result: {
    evidence: Array<{ category: string; id: string; quote: string; sourceId: string; sourceTitle: string }>;
    hypotheses: Array<{ description: string; suggestedValidation: string; title: string }>;
    insights: Array<{ confidence: string; contradictionFlag: boolean; description: string; evidenceIds: string[]; limitations: string[]; status: string; title: string }>;
    researchGaps: Array<{ question: string; reason: string; suggestedNextQuestions: string[] }>;
    themes: Array<{ description: string; title: string }>;
  } | null;
  safeErrorCode: string | null;
  status: "queued" | "running" | "completed" | "failed" | "invalidated";
};

export async function getLatestAnalysisRun(projectId: string): Promise<LatestAnalysisRun | null> {
  const supabase = await createServerSupabaseClient();
  const { data: run, error } = await supabase
    .from("analysis_runs")
    .select("id, status, safe_error_code")
    .eq("project_id", projectIdSchema.parse(projectId))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !run) return null;
  if (run.status !== "completed") return { id: run.id, result: null, safeErrorCode: run.safe_error_code, status: run.status };

  const [evidenceResult, themesResult, insightsResult, hypothesesResult, gapsResult] = await Promise.all([
    supabase.from("evidence_items").select("id, quote, category, source_id").eq("analysis_run_id", run.id),
    supabase.from("themes").select("title, description").eq("analysis_run_id", run.id),
    supabase.from("insights").select("id, title, description, status, confidence, contradiction_flag, limitations").eq("analysis_run_id", run.id),
    supabase.from("hypotheses").select("title, description, suggested_validation").eq("analysis_run_id", run.id),
    supabase.from("research_gaps").select("question, reason, suggested_next_questions").eq("analysis_run_id", run.id)
  ]);

  if (evidenceResult.error || themesResult.error || insightsResult.error || hypothesesResult.error || gapsResult.error) {
    throw new Error("Unable to load analysis results.");
  }

  const evidence = evidenceResult.data ?? [];
  const sourceIds = [...new Set(evidence.map((item) => item.source_id))];
  const { data: sources, error: sourcesError } = sourceIds.length
    ? await supabase.from("sources").select("id, title").in("id", sourceIds)
    : { data: [], error: null };
  const insightIds = (insightsResult.data ?? []).map((item) => item.id);
  const { data: insightLinks, error: insightLinksError } = insightIds.length
    ? await supabase.from("insight_evidence").select("insight_id, evidence_id").in("insight_id", insightIds)
    : { data: [], error: null };

  if (sourcesError || insightLinksError) throw new Error("Unable to load analysis results.");

  const sourceTitles = new Map((sources ?? []).map((source) => [source.id, source.title]));
  const evidenceIdsByInsight = new Map<string, string[]>();
  for (const link of insightLinks ?? []) {
    evidenceIdsByInsight.set(link.insight_id, [...(evidenceIdsByInsight.get(link.insight_id) ?? []), link.evidence_id]);
  }

  return {
    id: run.id,
    safeErrorCode: null,
    status: "completed",
    result: {
      evidence: evidence.map((item) => ({ category: item.category, id: item.id, quote: item.quote, sourceId: item.source_id, sourceTitle: sourceTitles.get(item.source_id) ?? "Source" })),
      themes: (themesResult.data ?? []).map((item) => ({ description: item.description, title: item.title })),
      insights: (insightsResult.data ?? []).map((item) => ({
        confidence: item.confidence,
        contradictionFlag: item.contradiction_flag,
        description: item.description,
        evidenceIds: evidenceIdsByInsight.get(item.id) ?? [],
        limitations: readStringArray(item.limitations),
        status: item.status,
        title: item.title
      })),
      hypotheses: (hypothesesResult.data ?? []).map((item) => ({ description: item.description, suggestedValidation: item.suggested_validation, title: item.title })),
      researchGaps: (gapsResult.data ?? []).map((item) => ({ question: item.question, reason: item.reason, suggestedNextQuestions: readStringArray(item.suggested_next_questions) }))
    }
  };
}

function readResearchQuestions(value: Json): string[] {
  return Array.isArray(value)
    ? value.filter((question): question is string => typeof question === "string")
    : [];
}

function readStringArray(value: Json): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
