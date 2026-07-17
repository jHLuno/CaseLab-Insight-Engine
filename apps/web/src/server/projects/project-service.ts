import { z } from "zod";
import type { Database } from "@/server/database/types";
import { requireUser, type AuthenticatedUser } from "@/server/auth/require-user";
import { createServerSupabaseClient } from "@/server/supabase/server";
import { projectInputSchema, type ProjectInput } from "./project-schema";

const projectIdSchema = z.string().uuid();

export type Project = Pick<
  Database["public"]["Tables"]["projects"]["Row"],
  "created_at" | "description" | "id" | "name" | "research_objective" | "status"
>;

function toProject(
  project: Database["public"]["Tables"]["projects"]["Row"]
): Project {
  return {
    created_at: project.created_at,
    description: project.description,
    id: project.id,
    name: project.name,
    research_objective: project.research_objective,
    status: project.status
  };
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const projectInput = projectInputSchema.parse(input);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("create_project_with_questions", {
    project_description: projectInput.description,
    project_name: projectInput.name,
    project_questions: projectInput.researchQuestions,
    project_research_objective: projectInput.researchObjective
  });

  if (error || !data) {
    throw new Error("Unable to create the project.");
  }

  return toProject(data);
}

export async function listProjectsForUser(): Promise<Project[]> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description, research_objective, status, created_at")
    .eq("organization_id", user.organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load projects.");
  }

  return data.map((project) => toProject({ ...project, organization_id: user.organizationId, updated_at: project.created_at }));
}

export async function getProjectForUser(
  projectId: string,
  user: AuthenticatedUser
): Promise<Project | null> {
  const id = projectIdSchema.parse(projectId);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description, research_objective, status, created_at")
    .eq("id", id)
    .eq("organization_id", user.organizationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toProject({ ...data, organization_id: user.organizationId, updated_at: data.created_at });
}
