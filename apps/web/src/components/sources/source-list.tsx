import type { Source } from "@/server/sources/source-service";

export function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) {
    return <p className="source-list__empty">No sources yet.</p>;
  }

  return (
    <ul className="source-list">
      {sources.map((source) => (
        <li key={source.id}>
          <span>{source.input_type === "pasted_text" ? "Pasted text" : "Text file"}</span>
          <strong>{source.title}</strong>
          <small>{source.character_count.toLocaleString()} characters</small>
        </li>
      ))}
    </ul>
  );
}
