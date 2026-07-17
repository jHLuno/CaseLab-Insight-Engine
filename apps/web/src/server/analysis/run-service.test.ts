import { describe, expect, it } from "vitest";
import { analysisRunIdSchema, projectIdSchema } from "./run-service";

describe("analysis run boundaries", () => {
  it("rejects an invalid project identifier before it can be queued", () => {
    expect(() => projectIdSchema.parse("not-a-project-id")).toThrow();
  });

  it("rejects an invalid analysis run identifier before it can be retried", () => {
    expect(() => analysisRunIdSchema.parse("not-a-run-id")).toThrow();
  });
});
