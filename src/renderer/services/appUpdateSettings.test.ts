import { describe, expect, it } from "vitest";
import {
  DEFAULT_AUTO_UPDATE_ON_STARTUP,
  normalizeAutoUpdateOnStartup
} from "./appUpdateSettings";

describe("app update settings", () => {
  it("passes through real booleans", () => {
    expect(normalizeAutoUpdateOnStartup(true)).toBe(true);
    expect(normalizeAutoUpdateOnStartup(false)).toBe(false);
  });

  it("falls back to the default for missing or non-boolean values", () => {
    expect(normalizeAutoUpdateOnStartup(undefined)).toBe(
      DEFAULT_AUTO_UPDATE_ON_STARTUP
    );
    expect(normalizeAutoUpdateOnStartup(null)).toBe(
      DEFAULT_AUTO_UPDATE_ON_STARTUP
    );
    expect(normalizeAutoUpdateOnStartup("true")).toBe(
      DEFAULT_AUTO_UPDATE_ON_STARTUP
    );
    expect(normalizeAutoUpdateOnStartup(1)).toBe(DEFAULT_AUTO_UPDATE_ON_STARTUP);
  });
});
