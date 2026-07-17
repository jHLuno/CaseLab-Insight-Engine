import { describe, expect, it, vi } from "vitest";
vi.mock("@trigger.dev/sdk", () => ({ task: vi.fn((definition) => definition) }));
import { executeAnalysisTask } from "./analyze-project";

describe("executeAnalysisTask", () => {
  it("marks a provider failure retryable without persisting output", async () => {
    const setState = vi.fn();
    const persist = vi.fn();

    await expect(
      executeAnalysisTask(
        { analysisRunId: "11111111-1111-4111-8111-111111111111" },
        {
          loadInput: vi.fn(),
          persist,
          provider: { analyze: vi.fn().mockRejectedValue(new Error("Analysis provider is temporarily unavailable.")) },
          setState
        }
      )
    ).rejects.toThrow("Analysis provider is temporarily unavailable.");

    expect(setState).toHaveBeenLastCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "failed",
      "provider_unavailable"
    );
    expect(persist).not.toHaveBeenCalled();
  });
});
