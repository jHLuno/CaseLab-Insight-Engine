import { z } from "zod";
import { normalizeSourceText } from "./normalize-source";

export const maximumPastedSourceCharacters = 100_000;
export const maximumSourceFileBytes = 1_048_576;

export type TextUpload = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  name: string;
  size: number;
  type: string;
};

export const sourceTitleSchema = z.string().trim().min(1).max(255);

export const pastedSourceInputSchema = z.object({
  text: z.string().min(1),
  title: sourceTitleSchema
});

export async function validateTextFile(file: TextUpload): Promise<string> {
  if (!file.name.toLowerCase().endsWith(".txt")) {
    throw new Error("Only .txt files are supported.");
  }

  if (file.size > maximumSourceFileBytes) {
    throw new Error("A .txt file must be 1 MiB or smaller.");
  }

  const buffer = await file.arrayBuffer();
  let text: string;

  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new Error("The .txt file must use UTF-8 encoding.");
  }

  return validatePastedSourceText(text);
}

export function validatePastedSourceText(text: string): string {
  const normalized = normalizeSourceText(text);

  if (normalized.length === 0) {
    throw new Error("A source cannot be empty.");
  }

  if (normalized.length > maximumPastedSourceCharacters) {
    throw new Error("Pasted text must be 100,000 characters or fewer.");
  }

  return normalized;
}
