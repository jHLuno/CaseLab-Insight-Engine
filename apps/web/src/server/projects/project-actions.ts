"use server";

import { redirect } from "next/navigation";
import { projectInputSchema } from "./project-schema";
import { createProject } from "./project-service";

export async function createProjectAction(formData: FormData) {
  const researchQuestions = String(formData.get("researchQuestions") ?? "")
    .split("\n")
    .map((question) => question.trim())
    .filter(Boolean);
  const input = projectInputSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    researchObjective: formData.get("researchObjective"),
    researchQuestions
  });

  if (!input.success) {
    redirect("/projects/new?error=invalid_project");
  }

  const project = await createProject(input.data);
  redirect(`/projects/${project.id}`);
}
