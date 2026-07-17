import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("RootLayout", () => {
  it("tolerates browser-extension attributes on the document body", async () => {
    const layoutPath = path.resolve(process.cwd(), "app/layout.tsx");
    const layoutSource = await readFile(layoutPath, "utf8");

    expect(layoutSource).toContain("<body suppressHydrationWarning>");
  });
});
