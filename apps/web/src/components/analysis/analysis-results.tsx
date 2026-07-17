export type AnalysisResultView = {
  evidence: Array<{ category: string; id: string; quote: string; sourceId: string; sourceTitle: string }>;
  themes: Array<{ description: string; title: string }>;
  insights: Array<{
    confidence: string;
    contradictionFlag: boolean;
    description: string;
    evidenceIds?: string[];
    limitations: string[];
    status: string;
    title: string;
  }>;
  hypotheses: Array<{ description: string; suggestedValidation: string; title: string }>;
  researchGaps: Array<{ question: string; reason: string; suggestedNextQuestions: string[] }>;
};

export function AnalysisResults({ result }: { result: AnalysisResultView }) {
  return (
    <div className="analysis-results">
      <section aria-labelledby="evidence-results-heading">
        <p className="eyebrow">Evidence</p>
        <h3 id="evidence-results-heading">What the sources directly say</h3>
        {result.evidence.length === 0 ? <p>No direct evidence was extracted. Review the research gaps below.</p> : null}
        <div className="evidence-cards">
          {result.evidence.map((item) => (
            <article className="evidence-card" id={`evidence-${item.id}`} key={item.id}>
              <p>“{item.quote}”</p>
              <small>{item.category} · {item.sourceTitle}</small>
              <a href={`#source-${item.sourceId}`}>View source evidence</a>
            </article>
          ))}
        </div>
      </section>
      <ResultSection heading="Themes" items={result.themes} />
      <section aria-labelledby="insights-heading">
        <p className="eyebrow">Insights</p>
        <h3 id="insights-heading">Interpretations tied to evidence</h3>
        {result.insights.map((item) => (
          <article className="analysis-card" key={item.title}>
            <p className="analysis-card__label">{item.status} · {item.confidence} confidence</p>
            <h4>{item.title}</h4>
            <p>{item.description}</p>
            {item.evidenceIds?.map((evidenceId) => <a href={`#evidence-${evidenceId}`} key={evidenceId}>View supporting evidence</a>)}
            {item.contradictionFlag ? <p>Contradictory evidence exists.</p> : null}
            {item.limitations.map((limitation) => <small key={limitation}>{limitation}</small>)}
          </article>
        ))}
      </section>
      <section aria-labelledby="hypotheses-heading">
        <p className="eyebrow">Hypotheses</p>
        <h3 id="hypotheses-heading">Ideas to validate, not findings</h3>
        {result.hypotheses.map((item) => (
          <article className="analysis-card" key={item.title}>
            <h4>{item.title}</h4>
            <p>{item.description}</p>
            <small>Validate by: {item.suggestedValidation}</small>
          </article>
        ))}
      </section>
      <section aria-labelledby="research-gaps-heading">
        <p className="eyebrow">Research gaps</p>
        <h3 id="research-gaps-heading">What the material cannot answer yet</h3>
        {result.researchGaps.map((item) => (
          <article className="analysis-card" key={item.question}>
            <h4>{item.question}</h4>
            <p>{item.reason}</p>
            <small>Next: {item.suggestedNextQuestions.join(" · ")}</small>
          </article>
        ))}
      </section>
    </div>
  );
}

function ResultSection({ heading, items }: { heading: string; items: Array<{ description: string; title: string }> }) {
  return (
    <section aria-labelledby={`${heading.toLowerCase()}-heading`}>
      <p className="eyebrow">Themes</p>
      <h3 id={`${heading.toLowerCase()}-heading`}>{heading}</h3>
      {items.map((item) => (
        <article className="analysis-card" key={item.title}>
          <h4>{item.title}</h4>
          <p>{item.description}</p>
        </article>
      ))}
    </section>
  );
}
