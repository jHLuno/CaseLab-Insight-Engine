import { describe, expect, it } from "vitest";
import { chunkSource } from "./chunk-source";
import { normalizeSourceText } from "./normalize-source";
import { validateTextFile } from "./source-schema";

describe("source ingestion boundaries", () => {
  it("keeps deterministic offsets while chunking normalized text", () => {
    const normalized = normalizeSourceText("One.\r\nTwo. Three.");
    const chunks = chunkSource(normalized, { maxCharacters: 8 });

    expect(chunks[0]).toMatchObject({ index: 0, startOffset: 0 });
    expect(chunks.map((chunk) => chunk.text).join("")).toBe(normalized);
  });

  it("rejects a .txt file larger than one MiB", async () => {
    await expect(
      validateTextFile({
        arrayBuffer: async () => new ArrayBuffer(0),
        name: "interview.txt",
        size: 1_048_577,
        type: "text/plain"
      })
    ).rejects.toThrow("1 MiB");
  });
});
