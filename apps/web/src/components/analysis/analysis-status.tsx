import { RunAnalysisButton } from "./run-analysis-button";
import { AnalysisAutoRefresh } from "./analysis-auto-refresh";

type AnalysisStatusProps = {
  retryAction: (formData: FormData) => void | Promise<void>;
  safeErrorCode: string | null;
  status: "queued" | "running" | "completed" | "failed" | "invalidated";
};

export function AnalysisStatus({ retryAction, safeErrorCode, status }: AnalysisStatusProps) {
  if (status === "completed") {
    return <p className="analysis-status" role="status">Analysis completed. Review the evidence before drawing conclusions.</p>;
  }

  if (status === "queued" || status === "running") {
    return (
      <div className="analysis-status" role="status" aria-live="polite">
        <AnalysisAutoRefresh status={status} />
        <p>{status === "queued" ? "Analysis queued. Preparing your saved sources…" : "Analyzing saved sources…"}</p>
      </div>
    );
  }

  if (status === "invalidated") {
    return <p className="analysis-status" role="alert">This analysis is no longer available because one of its sources changed or was deleted.</p>;
  }

  const retryable = safeErrorCode === "provider_unavailable" || safeErrorCode === "task_unavailable";
  return (
    <div className="analysis-status" role="alert">
      <p>Analysis could not be completed. Your sources are unchanged.</p>
      {retryable ? <RunAnalysisButton action={retryAction} canRun /> : null}
    </div>
  );
}
