"use server";

import { tasks } from "@trigger.dev/sdk";
import type { analyzeProject } from "../../../trigger/analyze-project";
import { queueAnalysisRun, retryAnalysisRun, setAnalysisRunState, setAnalysisTriggerRunId } from "./run-service";

export async function startAnalysisAction(projectId: string): Promise<void> {
  const run = await queueAnalysisRun(projectId);
  await triggerAnalysisRun(run.id);
}

export async function retryAnalysisAction(runId: string): Promise<void> {
  const run = await retryAnalysisRun(runId);
  await triggerAnalysisRun(run.id);
}

async function triggerAnalysisRun(analysisRunId: string): Promise<void> {
  try {
    const handle = await tasks.trigger<typeof analyzeProject>("analyze-project", { analysisRunId });
    await setAnalysisTriggerRunId(analysisRunId, handle.id);
  } catch {
    await setAnalysisRunState(analysisRunId, "failed", "task_unavailable");
    throw new Error("Analysis could not be queued. Please try again.");
  }
}
