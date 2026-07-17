import { z } from "zod";
import type { Database } from "@/server/database/types";
import { requireUser } from "@/server/auth/require-user";
import { createServerSupabaseClient } from "@/server/supabase/server";
import { chunkSource, type SourceChunk } from "./chunk-source";
import {
  pastedSourceInputSchema,
  sourceTitleSchema,
  type TextUpload,
  validatePastedSourceText,
  validateTextFile
} from "./source-schema";

const projectIdSchema = z.string().uuid();
const sourceChunkMaximumCharacters = 2_000;

export type Source = Pick<
  Database["public"]["Tables"]["sources"]["Row"],
  "character_count" | "created_at" | "id" | "input_type" | "title"
>;

export function toDatabaseChunks(chunks: SourceChunk[]) {
  return chunks.map((chunk) => ({
    chunk_index: chunk.index,
    content: chunk.text,
    end_offset: chunk.endOffset,
    start_offset: chunk.startOffset
  }));
}

async function persistSource(input: {
  normalizedContent: string;
  projectId: string;
  storagePath: string | null;
  title: string;
  type: "pasted_text" | "text_upload";
}): Promise<Database["public"]["Tables"]["sources"]["Row"]> {
  const projectId = projectIdSchema.parse(input.projectId);
  const sourceId = crypto.randomUUID();
  const chunks = toDatabaseChunks(
    chunkSource(input.normalizedContent, {
      maxCharacters: sourceChunkMaximumCharacters
    })
  );
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("create_source_with_chunks", {
    input_character_count: input.normalizedContent.length,
    input_chunks: chunks,
    input_normalized_content: input.normalizedContent,
    input_project_id: projectId,
    input_source_id: sourceId,
    input_storage_path: input.storagePath,
    input_title: input.title,
    input_type: input.type
  });

  if (error || !data) {
    throw new Error("Unable to add this source to the project.");
  }

  return data;
}

export async function createPastedSource(
  projectId: string,
  input: { text: string; title: string }
): Promise<Source> {
  const parsed = pastedSourceInputSchema.parse(input);
  const normalizedContent = validatePastedSourceText(parsed.text);
  const source = await persistSource({
    normalizedContent,
    projectId,
    storagePath: null,
    title: parsed.title,
    type: "pasted_text"
  });

  return toSource(source);
}

export async function createUploadedSource(
  projectId: string,
  file: TextUpload,
  requestedTitle?: string
): Promise<Source> {
  const normalizedContent = await validateTextFile(file);
  const title = sourceTitleSchema.parse(
    requestedTitle?.trim() || file.name.replace(/\.txt$/i, "")
  );
  const user = await requireUser();
  const sourceId = crypto.randomUUID();
  const storagePath = `organizations/${user.organizationId}/projects/${projectId}/sources/${sourceId}/original.txt`;
  const supabase = await createServerSupabaseClient();
  const upload = await supabase.storage
    .from("caselab-sources")
    .upload(storagePath, new Uint8Array(await file.arrayBuffer()), {
      contentType: "text/plain",
      upsert: false
    });

  if (upload.error) {
    throw new Error("Unable to store the uploaded source.");
  }

  try {
    const chunks = toDatabaseChunks(
      chunkSource(normalizedContent, {
        maxCharacters: sourceChunkMaximumCharacters
      })
    );
    const { data, error } = await supabase.rpc("create_source_with_chunks", {
      input_character_count: normalizedContent.length,
      input_chunks: chunks,
      input_normalized_content: normalizedContent,
      input_project_id: projectIdSchema.parse(projectId),
      input_source_id: sourceId,
      input_storage_path: storagePath,
      input_title: title,
      input_type: "text_upload"
    });

    if (error || !data) {
      throw new Error("Unable to add this source to the project.");
    }

    return toSource(data);
  } catch (error) {
    await supabase.storage.from("caselab-sources").remove([storagePath]);
    throw error;
  }
}

export async function listSources(projectId: string): Promise<Source[]> {
  const id = projectIdSchema.parse(projectId);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("sources")
    .select("id, title, input_type, character_count, created_at")
    .eq("project_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load project sources.");
  }

  return data;
}

function toSource(source: Database["public"]["Tables"]["sources"]["Row"]): Source {
  return {
    character_count: source.character_count,
    created_at: source.created_at,
    id: source.id,
    input_type: source.input_type,
    title: source.title
  };
}
