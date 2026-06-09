import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCAN_FRESHNESS_THRESHOLD_DAYS,
  formatScanFreshnessThresholdDetail,
  getScanFreshnessCutoffMs,
  normalizeScanFreshnessThresholdDays,
  parseScanFreshnessThresholdDays
} from "./scanFreshnessThreshold";

describe("scan freshness threshold", () => {
  it("normalizes missing or invalid values to the default", () => {
    expect(normalizeScanFreshnessThresholdDays(null)).toBe(
      DEFAULT_SCAN_FRESHNESS_THRESHOLD_DAYS
    );
    expect(normalizeScanFreshnessThresholdDays("")).toBe(
      DEFAULT_SCAN_FRESHNESS_THRESHOLD_DAYS
    );
    expect(normalizeScanFreshnessThresholdDays("2.5")).toBe(
      DEFAULT_SCAN_FRESHNESS_THRESHOLD_DAYS
    );
    expect(normalizeScanFreshnessThresholdDays(0)).toBe(
      DEFAULT_SCAN_FRESHNESS_THRESHOLD_DAYS
    );
  });

  it("parses valid whole-day thresholds", () => {
    expect(parseScanFreshnessThresholdDays("180")).toBe(180);
    expect(parseScanFreshnessThresholdDays(365)).toBe(365);
  });

  it("formats the dashboard detail label", () => {
    expect(formatScanFreshnessThresholdDetail(1)).toBe("Last 1 day");
    expect(formatScanFreshnessThresholdDetail(180)).toBe("Last 180 days");
  });

  it("calculates the day-based cutoff", () => {
    const referenceMs = Date.UTC(2026, 5, 9, 12);

    expect(getScanFreshnessCutoffMs(referenceMs, 180)).toBe(
      referenceMs - 180 * 24 * 60 * 60 * 1000
    );
  });
});
