import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queueAnalysisRun: vi.fn(),
  revalidatePath: vi.fn(),
  setAnalysisRunState: vi.fn(),
  setAnalysisTriggerRunId: vi.fn(),
  trigger: vi.fn()
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@trigger.dev/sdk", () => ({ tasks: { trigger: mocks.trigger } }));
vi.mock("./run-service", () => ({
  queueAnalysisRun: mocks.queueAnalysisRun,
  retryAnalysisRun: vi.fn(),
  setAnalysisRunState: mocks.setAnalysisRunState,
  setAnalysisTriggerRunId: mocks.setAnalysisTriggerRunId
}));

import { startAnalysisAction } from "./run-actions";

describe("startAnalysisAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setAnalysisRunState.mockResolvedValue(undefined);
    mocks.setAnalysisTriggerRunId.mockResolvedValue(undefined);
  });

  it("sends only the analysis run ID to Trigger.dev", async () => {
    mocks.queueAnalysisRun.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111", status: "queued" });
    mocks.trigger.mockResolvedValue({ id: "trigger-run-id" });

    await startAnalysisAction("22222222-2222-4222-8222-222222222222");

    expect(mocks.trigger).toHaveBeenCalledWith("analyze-project", {
      analysisRunId: "11111111-1111-4111-8111-111111111111"
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/projects/22222222-2222-4222-8222-222222222222"
    );
  });
});
