import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/server/auth/require-user";
import { getProjectForUser } from "@/server/projects/project-service";
import {
  createPastedSourceAction,
  createUploadedSourceAction
} from "@/server/sources/source-actions";
import { listSources } from "@/server/sources/source-service";
import { getLatestAnalysisRun } from "@/server/analysis/run-service";
import { retryAnalysisAction, startAnalysisAction } from "@/server/analysis/run-actions";
import { AnalysisResults } from "@/components/analysis/analysis-results";
import { AnalysisStatus } from "@/components/analysis/analysis-status";
import { RunAnalysisButton } from "@/components/analysis/run-analysis-button";
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
  const sourceState = await searchParams;

  if (!project) {
    notFound();
  }

  const [sources, analysisRun] = await Promise.all([listSources(projectId), getLatestAnalysisRun(projectId)]);

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
        <section className="analysis-section" aria-labelledby="analysis-heading">
          <p className="eyebrow">Analysis</p>
          <h2 id="analysis-heading">Turn evidence into careful conclusions.</h2>
          {!analysisRun ? (
            <RunAnalysisButton
              action={startAnalysisAction.bind(null, project.id)}
              canRun={Boolean(project.research_objective.trim()) && sources.length > 0}
            />
          ) : null}
          {analysisRun ? (
            <AnalysisStatus
              retryAction={retryAnalysisAction.bind(null, analysisRun.id)}
              safeErrorCode={analysisRun.safeErrorCode}
              status={analysisRun.status}
            />
          ) : null}
          {analysisRun?.status === "completed" ? (
            <RunAnalysisButton action={startAnalysisAction.bind(null, project.id)} canRun />
          ) : null}
          {analysisRun?.result ? <AnalysisResults result={analysisRun.result} /> : null}
        </section>
      </section>
    </main>
  );
}
