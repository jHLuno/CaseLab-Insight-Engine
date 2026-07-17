type ProjectFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
};

export function ProjectForm({ action, error }: ProjectFormProps) {
  return (
    <form action={action} className="project-form">
      {error ? <p className="auth-message" role="alert">{error}</p> : null}
      <label htmlFor="name">Project name</label>
      <input id="name" maxLength={160} name="name" required />
      <label htmlFor="description">Description <span>(optional)</span></label>
      <textarea id="description" maxLength={4000} name="description" rows={3} />
      <label htmlFor="researchObjective">Research objective</label>
      <textarea id="researchObjective" maxLength={4000} name="researchObjective" required rows={5} />
      <label htmlFor="researchQuestions">Research questions <span>(one per line, optional)</span></label>
      <textarea id="researchQuestions" name="researchQuestions" rows={5} />
      <button type="submit">Create project</button>
    </form>
  );
}
