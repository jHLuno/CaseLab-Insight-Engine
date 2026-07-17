export type SourceChunk = {
  endOffset: number;
  index: number;
  startOffset: number;
  text: string;
};

export function chunkSource(
  text: string,
  options: { maxCharacters: number }
): SourceChunk[] {
  const chunks: SourceChunk[] = [];
  let startOffset = 0;

  while (startOffset < text.length) {
    let endOffset = Math.min(startOffset + options.maxCharacters, text.length);

    if (endOffset < text.length) {
      const candidate = text.slice(startOffset, endOffset);
      const boundary = Math.max(
        candidate.lastIndexOf("\n\n"),
        candidate.lastIndexOf(". "),
        candidate.lastIndexOf(" ")
      );

      if (boundary > options.maxCharacters / 2) {
        endOffset = startOffset + boundary + 1;
      }
    }

    chunks.push({
      endOffset,
      index: chunks.length,
      startOffset,
      text: text.slice(startOffset, endOffset)
    });
    startOffset = endOffset;
  }

  return chunks;
}
