export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

/**
 * Schema-aligned Supabase types. Regenerate with the local Supabase CLI once
 * Docker is available; this file intentionally contains no credentials.
 */
export type Database = {
  public: {
    Tables: {
      organizations: Table<
        { id: string; name: string; created_at: string; updated_at: string },
        { id?: string; name: string; created_at?: string; updated_at?: string },
        { name?: string; updated_at?: string }
      >;
      organization_members: Table<
        { organization_id: string; user_id: string; role: "owner"; created_at: string },
        { organization_id: string; user_id: string; role?: "owner"; created_at?: string },
        { role?: "owner" }
      >;
      projects: Table<
        { id: string; organization_id: string; name: string; description: string; research_objective: string; status: "active" | "archived"; created_at: string; updated_at: string },
        { id?: string; organization_id: string; name: string; description?: string; research_objective?: string; status?: "active" | "archived"; created_at?: string; updated_at?: string },
        { name?: string; description?: string; research_objective?: string; status?: "active" | "archived"; updated_at?: string }
      >;
      research_questions: Table<
        { id: string; project_id: string; question: string; position: number; created_at: string; updated_at: string },
        { id?: string; project_id: string; question: string; position: number; created_at?: string; updated_at?: string },
        { question?: string; position?: number; updated_at?: string }
      >;
      sources: Table<
        { id: string; project_id: string; title: string; input_type: "pasted_text" | "text_upload"; storage_path: string | null; normalized_content: string; character_count: number; uploaded_by: string; deleted_at: string | null; created_at: string; updated_at: string },
        { id?: string; project_id: string; title: string; input_type: "pasted_text" | "text_upload"; storage_path?: string | null; normalized_content: string; character_count: number; uploaded_by: string; deleted_at?: string | null; created_at?: string; updated_at?: string },
        { title?: string; storage_path?: string | null; normalized_content?: string; character_count?: number; deleted_at?: string | null; updated_at?: string }
      >;
      source_chunks: Table<
        { id: string; source_id: string; chunk_index: number; content: string; start_offset: number; end_offset: number; created_at: string },
        { id?: string; source_id: string; chunk_index: number; content: string; start_offset: number; end_offset: number; created_at?: string },
        { chunk_index?: number; content?: string; start_offset?: number; end_offset?: number }
      >;
      analysis_runs: Table<
        { id: string; project_id: string; source_ids: string[]; objective_snapshot: string; research_questions_snapshot: Json; model: string; prompt_version: string; status: "queued" | "running" | "completed" | "failed" | "invalidated"; safe_error_code: string | null; trigger_run_id: string | null; usage: Json; created_at: string; updated_at: string },
        { id?: string; project_id: string; source_ids: string[]; objective_snapshot: string; research_questions_snapshot?: Json; model: string; prompt_version: string; status: "queued" | "running" | "completed" | "failed" | "invalidated"; safe_error_code?: string | null; trigger_run_id?: string | null; usage?: Json; created_at?: string; updated_at?: string },
        { status?: "queued" | "running" | "completed" | "failed" | "invalidated"; safe_error_code?: string | null; trigger_run_id?: string | null; usage?: Json; updated_at?: string }
      >;
      evidence_items: Table<
        { id: string; analysis_run_id: string; source_id: string; source_chunk_id: string; quote: string; category: "pain" | "need" | "motivation" | "objection" | "desire" | "language_pattern" | "other"; speaker_label: string | null; normalized_claim: string; created_at: string },
        { id?: string; analysis_run_id: string; source_id: string; source_chunk_id: string; quote: string; category: "pain" | "need" | "motivation" | "objection" | "desire" | "language_pattern" | "other"; speaker_label?: string | null; normalized_claim: string; created_at?: string },
        never
      >;
      themes: Table<{ id: string; analysis_run_id: string; title: string; description: string; created_at: string }, { id?: string; analysis_run_id: string; title: string; description: string; created_at?: string }, never>;
      theme_evidence: Table<{ theme_id: string; evidence_id: string }, { theme_id: string; evidence_id: string }, never>;
      insights: Table<
        { id: string; analysis_run_id: string; title: string; description: string; status: "validated" | "emerging" | "hypothesis" | "needs_more_research"; confidence: "high" | "medium" | "low" | "unknown"; contradiction_flag: boolean; limitations: Json; created_at: string },
        { id?: string; analysis_run_id: string; title: string; description: string; status: "validated" | "emerging" | "hypothesis" | "needs_more_research"; confidence: "high" | "medium" | "low" | "unknown"; contradiction_flag?: boolean; limitations?: Json; created_at?: string },
        never
      >;
      insight_evidence: Table<{ insight_id: string; evidence_id: string }, { insight_id: string; evidence_id: string }, never>;
      hypotheses: Table<{ id: string; analysis_run_id: string; title: string; description: string; suggested_validation: string; created_at: string }, { id?: string; analysis_run_id: string; title: string; description: string; suggested_validation: string; created_at?: string }, never>;
      hypothesis_evidence: Table<{ hypothesis_id: string; evidence_id: string }, { hypothesis_id: string; evidence_id: string }, never>;
      research_gaps: Table<{ id: string; analysis_run_id: string; question: string; reason: string; suggested_next_questions: Json; created_at: string }, { id?: string; analysis_run_id: string; question: string; reason: string; suggested_next_questions?: Json; created_at?: string }, never>;
      report_exports: Table<{ id: string; project_id: string; requested_by: string; generated_at: string; artifact_metadata: Json }, { id?: string; project_id: string; requested_by: string; generated_at?: string; artifact_metadata?: Json }, never>;
    };
    Views: Record<string, never>;
    Functions: {
      delete_project_cascade: { Args: { project_uuid: string }; Returns: { storage_path: string }[] };
      delete_source_cascade: { Args: { source_uuid: string }; Returns: { storage_path: string }[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
