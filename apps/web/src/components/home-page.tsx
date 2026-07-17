const workflowSteps = [
  {
    label: "Evidence",
    description: "Exact customer language, linked to its source."
  },
  {
    label: "Theme",
    description: "A repeated pattern across evidence."
  },
  {
    label: "Insight",
    description: "An interpretation with its support in view."
  }
];

export function HomePage() {
  return (
    <main className="home-page">
      <aside aria-label="CaseLab principle" className="evidence-margin">
        <span className="evidence-margin__line" aria-hidden="true" />
        <p>Evidence before conclusion</p>
      </aside>

      <section className="home-page__content">
        <p className="eyebrow">CaseLab / Insight Engine</p>
        <h1>Start with what people actually said.</h1>
        <p className="lede">
          A calm workspace for turning qualitative research into conclusions
          that can be inspected, challenged, and trusted.
        </p>

        <section aria-labelledby="evidence-model">
          <h2 id="evidence-model">From source material to a defensible decision</h2>
          <ol className="workflow-list">
            {workflowSteps.map((step) => (
              <li key={step.label}>
                <span>{step.label}</span>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>
      </section>
    </main>
  );
}
