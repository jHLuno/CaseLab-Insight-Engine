import { describe, expect, it } from "vitest";
import { createProject } from "./project-service";

describe("createProject", () => {
  it("rejects a project without a research objective", async () => {
    await expect(
      createProject({
        name: "Pricing study",
        researchObjective: "",
        researchQuestions: []
      })
    ).rejects.toThrow("research objective");
  });
});
