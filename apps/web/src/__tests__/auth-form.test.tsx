import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthForm } from "@/components/auth-form";

describe("AuthForm", () => {
  it("renders the required sign-in credentials and submit action", () => {
    const markup = renderToStaticMarkup(
      <AuthForm action={async () => undefined} mode="sign-in" />
    );

    expect(markup).toContain("Sign in to CaseLab");
    expect(markup).toContain('name="email"');
    expect(markup).toContain('name="password"');
    expect(markup).toContain("Sign in");
  });
});
