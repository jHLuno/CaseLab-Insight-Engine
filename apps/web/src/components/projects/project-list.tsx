import type { Project } from "@/server/projects/project-service";
import Link from "next/link";

export function ProjectList({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <section className="empty-state" aria-labelledby="empty-projects-heading">
        <p className="eyebrow">No projects yet</p>
        <h2 id="empty-projects-heading">Give your next decision a traceable starting point.</h2>
        <p>Create a project, define its research objective, then add the source material behind the work.</p>
        <Link className="button-link" href="/projects/new">Create your first project</Link>
      </section>
    );
  }

  return (
    <ul className="project-list">
      {projects.map((project) => (
        <li key={project.id}>
          <Link href={`/projects/${project.id}`}>
            <span>{project.status}</span>
            <h2>{project.name}</h2>
            <p>{project.research_objective}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
