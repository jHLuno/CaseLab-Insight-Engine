import { ProjectForm } from "@/components/projects/project-form";
import Link from "next/link";
import { createProjectAction } from "@/server/projects/project-actions";

type NewProjectPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewProjectPage({ searchParams }: NewProjectPageProps) {
  const { error } = await searchParams;

  return (
    <main className="app-page">
      <Link className="back-link" href="/">← Projects</Link>
      <section className="form-page" aria-labelledby="new-project-heading">
        <p className="eyebrow">New research project</p>
        <h1 id="new-project-heading">Set the question before reading the evidence.</h1>
        <p className="lede">A clear research objective anchors the analysis and makes its limitations visible.</p>
        <ProjectForm
          action={createProjectAction}
          error={error === "invalid_project" ? "Add a project name and research objective before continuing." : undefined}
        />
      </section>
    </main>
  );
}
