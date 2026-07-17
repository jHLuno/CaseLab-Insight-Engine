export function normalizeSourceText(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim();
}
