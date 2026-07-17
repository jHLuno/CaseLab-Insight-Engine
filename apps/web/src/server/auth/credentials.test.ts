import { describe, expect, it } from "vitest";
import { parseAuthCredentials } from "./credentials";

describe("parseAuthCredentials", () => {
  it("accepts a valid email and a twelve-character password", () => {
    expect(
      parseAuthCredentials({
        email: "researcher@example.com",
        password: "long-password"
      })
    ).toEqual({ email: "researcher@example.com", password: "long-password" });
  });

  it("rejects a short password before it reaches Supabase", () => {
    expect(() =>
      parseAuthCredentials({ email: "researcher@example.com", password: "short" })
    ).toThrow();
  });
});
