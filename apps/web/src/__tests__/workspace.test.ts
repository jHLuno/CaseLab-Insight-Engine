import { describe, expect, it } from "vitest";

describe("workspace", () => {
  it("loads the shared package", async () => {
    const shared = await import("@caselab/shared");

    expect(shared).toBeDefined();
  });
});
