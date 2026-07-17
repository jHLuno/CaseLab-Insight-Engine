import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomePage } from "@/components/home-page";

describe("HomePage", () => {
  it("introduces the evidence-first research workflow", () => {
    const markup = renderToStaticMarkup(<HomePage />);

    expect(markup).toContain("Start with what people actually said.");
    expect(markup).toContain("Evidence before conclusion");
    expect(markup).toContain("Evidence");
    expect(markup).toContain("Insight");
    expect(markup).toContain('href="/sign-in"');
    expect(markup).toContain('href="/sign-up"');
    expect(markup).toContain("Create your account");
  });
});
