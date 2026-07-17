import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/server/auth/require-user";
import { getProjectForUser } from "@/server/projects/project-service";
import {
  createPastedSourceAction,
  createUploadedSourceAction
} from "@/server/sources/source-actions";
import { listSources } from "@/server/sources/source-service";
import { PasteSourceForm } from "@/components/sources/paste-source-form";
import { SourceList } from "@/components/sources/source-list";
import { UploadSourceForm } from "@/components/sources/upload-source-form";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ source_error?: string; source_success?: string }>;
};

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const [{ projectId }, user] = await Promise.all([params, requireUser()]);
  const project = await getProjectForUser(projectId, user);
  const sources = await listSources(projectId);
  const sourceState = await searchParams;

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
        <section className="sources-section" aria-labelledby="sources-heading">
          <p className="eyebrow">Sources</p>
          <h2 id="sources-heading">Start with what people actually said.</h2>
          {sourceState.source_error ? <p className="auth-message" role="alert">We could not add that source. Check the limits and try again.</p> : null}
          {sourceState.source_success ? <p className="auth-message" role="status">Source added. It is ready for evidence extraction.</p> : null}
          <div className="source-forms">
            <PasteSourceForm action={createPastedSourceAction.bind(null, project.id)} />
            <UploadSourceForm action={createUploadedSourceAction.bind(null, project.id)} />
          </div>
          <SourceList sources={sources} />
        </section>
      </section>
    </main>
  );
}
