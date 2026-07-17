import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/server/auth/require-user";
import { getProjectForUser } from "@/server/projects/project-service";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const [{ projectId }, user] = await Promise.all([params, requireUser()]);
  const project = await getProjectForUser(projectId, user);

  if (!project) {
    notFound();
  }

  return (
    <main className="app-page">
      <Link className="back-link" href="/">← Projects</Link>
      <section className="project-detail" aria-labelledby="project-heading">
        <p className="eyebrow">{project.status} project</p>
        <h1 id="project-heading">{project.name}</h1>
        {project.description ? <p className="lede">{project.description}</p> : null}
        <section aria-labelledby="objective-heading">
          <p className="eyebrow">Research objective</p>
          <h2 id="objective-heading">{project.research_objective}</h2>
        </section>
        <section className="empty-state" aria-labelledby="sources-heading">
          <p className="eyebrow">Sources</p>
          <h2 id="sources-heading">Evidence comes next.</h2>
          <p>Add pasted text or a `.txt` source to begin the evidence layer.</p>
        </section>
      </section>
    </main>
  );
}
