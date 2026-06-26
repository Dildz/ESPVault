import { describe, expect, it } from "vitest";
import { isHttpUrl } from "./projectLinks";

describe("isHttpUrl", () => {
  it("accepts http and https URLs", () => {
    expect(isHttpUrl("https://github.com/Dildz/ESPVault")).toBe(true);
    expect(isHttpUrl("http://example.com")).toBe(true);
    expect(isHttpUrl("  https://example.com  ")).toBe(true);
  });

  it("rejects empty, malformed, or non-web protocols", () => {
    expect(isHttpUrl(null)).toBe(false);
    expect(isHttpUrl(undefined)).toBe(false);
    expect(isHttpUrl("")).toBe(false);
    expect(isHttpUrl("github.com/Dildz")).toBe(false);
    expect(isHttpUrl("file:///c:/code")).toBe(false);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
  });
});
