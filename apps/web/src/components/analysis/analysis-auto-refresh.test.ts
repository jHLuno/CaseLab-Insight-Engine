import { describe, expect, it } from "vitest";
import { shouldRefreshAnalysis } from "./analysis-auto-refresh";

describe("analysis status refresh", () => {
  it("refreshes only while a run is queued or running", () => {
    expect(shouldRefreshAnalysis("queued")).toBe(true);
    expect(shouldRefreshAnalysis("running")).toBe(true);
    expect(shouldRefreshAnalysis("completed")).toBe(false);
    expect(shouldRefreshAnalysis("failed")).toBe(false);
    expect(shouldRefreshAnalysis("invalidated")).toBe(false);
  });
});
