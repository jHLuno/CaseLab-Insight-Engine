type RunAnalysisButtonProps = {
  action: (formData: FormData) => void | Promise<void>;
  canRun: boolean;
};

export function RunAnalysisButton({ action, canRun }: RunAnalysisButtonProps) {
  return (
    <form action={action} className="analysis-action">
      <button type="submit" disabled={!canRun}>
        Run analysis
      </button>
      {!canRun ? (
        <p>Add a research objective and at least one source to run analysis.</p>
      ) : null}
    </form>
  );
}
