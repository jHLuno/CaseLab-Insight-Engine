import { HomePage } from "@/components/home-page";
import Link from "next/link";
import { ProjectList } from "@/components/projects/project-list";
import { listProjectsForUser } from "@/server/projects/project-service";
import { hasSupabasePublicEnvironment } from "@/server/supabase/env";

export default async function Page() {
  if (!hasSupabasePublicEnvironment()) {
    return <HomePage />;
  }

  const projects = await listProjectsForUser();

  return (
    <main className="app-page">
      <header className="app-header">
        <div>
          <p className="eyebrow">CaseLab / Projects</p>
          <h1>Research that stays connected to its evidence.</h1>
        </div>
        <Link className="button-link" href="/projects/new">New project</Link>
      </header>
      <ProjectList projects={projects} />
    </main>
  );
}
