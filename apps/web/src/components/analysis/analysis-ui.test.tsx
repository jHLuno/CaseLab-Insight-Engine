import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnalysisResults } from "./analysis-results";
import { RunAnalysisButton } from "./run-analysis-button";

describe("analysis workspace UI", () => {
  it("disables Run analysis until an objective and source exist", () => {
    const markup = renderToStaticMarkup(<RunAnalysisButton canRun={false} action={async () => {}} />);

    expect(markup).toContain('disabled=""');
    expect(markup).toContain("Add a research objective and at least one source");
  });

  it("links each evidence quote to its source", () => {
    const markup = renderToStaticMarkup(
      <AnalysisResults
        result={{
          evidence: [
            {
              category: "objection",
              id: "evidence-1",
              quote: "The price feels risky.",
              sourceId: "source-1",
              sourceTitle: "Interview notes"
            }
          ],
          hypotheses: [
            { description: "Risk framing may matter.", suggestedValidation: "Test a guarantee.", title: "Risk framing" }
          ],
          insights: [],
          researchGaps: [
            { question: "What reduces risk?", reason: "The source does not say.", suggestedNextQuestions: ["What proof would help?"] }
          ],
          themes: []
        }}
      />
    );

    expect(markup).toContain('href="#source-source-1"');
    expect(markup).toContain("View source evidence");
  });

  it("renders Hypothesis and Research gap separately", () => {
    const markup = renderToStaticMarkup(
      <AnalysisResults
        result={{
          evidence: [],
          hypotheses: [
            { description: "Risk framing may matter.", suggestedValidation: "Test a guarantee.", title: "Risk framing" }
          ],
          insights: [],
          researchGaps: [
            { question: "What reduces risk?", reason: "The source does not say.", suggestedNextQuestions: ["What proof would help?"] }
          ],
          themes: []
        }}
      />
    );

    expect(markup).toContain("Hypotheses");
    expect(markup).toContain("Research gaps");
  });
});
