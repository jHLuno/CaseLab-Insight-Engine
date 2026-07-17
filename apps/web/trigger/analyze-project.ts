import { task } from "@trigger.dev/sdk";
import { z } from "zod";
import type { AnalysisProvider } from "@/server/analysis/analysis-provider";
import { OpenRouterAnalysisProvider } from "@/server/analysis/openrouter-provider";
import { persistVerifiedOutput } from "@/server/analysis/persist-output";
import { loadAnalysisInput, setAnalysisRunState } from "@/server/analysis/run-service";
import { verifyAnalysisOutput } from "@/server/analysis/verify-output";

const payloadSchema = z.object({ analysisRunId: z.string().uuid() });

type TaskDependencies = {
  loadInput: typeof loadAnalysisInput;
  persist: typeof persistVerifiedOutput;
  provider: AnalysisProvider;
  setState: typeof setAnalysisRunState;
};

const defaultDependencies: TaskDependencies = {
  loadInput: loadAnalysisInput,
  persist: persistVerifiedOutput,
  provider: new OpenRouterAnalysisProvider(),
  setState: setAnalysisRunState
};

export async function executeAnalysisTask(
  payload: unknown,
  dependencies: TaskDependencies = defaultDependencies
): Promise<void> {
  const { analysisRunId } = payloadSchema.parse(payload);

  try {
    await dependencies.setState(analysisRunId, "running");
    const input = await dependencies.loadInput(analysisRunId);
    const providerResult = await dependencies.provider.analyze(input);
    const verifiedOutput = verifyAnalysisOutput(providerResult.output, input.sourceChunks);
    await dependencies.persist(analysisRunId, verifiedOutput, providerResult.usage);
  } catch (error) {
    const safeErrorCode = analysisFailureCode(error);
    await dependencies.setState(analysisRunId, "failed", safeErrorCode);

    if (safeErrorCode === "provider_unavailable") {
      throw error;
    }
  }
}

function analysisFailureCode(error: unknown): "provider_unavailable" | "invalid_provider_output" | "analysis_failed" {
  if (error instanceof Error && error.message === "Analysis provider is temporarily unavailable.") {
    return "provider_unavailable";
  }

  if (error instanceof Error && error.message === "Analysis provider returned an invalid response.") {
    return "invalid_provider_output";
  }

  return "analysis_failed";
}

export const analyzeProject = task({
  id: "analyze-project",
  retry: { maxAttempts: 3 },
  run: async (payload: { analysisRunId: string }) => executeAnalysisTask(payload)
});
