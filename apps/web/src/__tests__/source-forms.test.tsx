import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PasteSourceForm } from "@/components/sources/paste-source-form";
import { UploadSourceForm } from "@/components/sources/upload-source-form";

describe("source forms", () => {
  it("offers both pasted-text and .txt upload inputs", () => {
    const action = async () => undefined;
    const markup = renderToStaticMarkup(
      <>
        <PasteSourceForm action={action} />
        <UploadSourceForm action={action} />
      </>
    );

    expect(markup).toContain('name="text"');
    expect(markup).toContain('type="file"');
    expect(markup).toContain('accept=".txt,text/plain"');
  });
});
