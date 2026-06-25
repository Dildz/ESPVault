import { describe, expect, it } from "vitest";
import { ref } from "vue";
import type { Board } from "../../../shared/types/board";
import { useScanFreshnessInsights } from "./useScanFreshnessInsights";

const DAY_MS = 24 * 60 * 60 * 1000;

function makeBoard(lastScannedAt: string | null): Board {
  return { lastScannedAt } as unknown as Board;
}

function metricsByKey(boards: Board[], thresholdDays: number) {
  const { scanFreshnessMetrics } = useScanFreshnessInsights(
    ref(boards),
    ref(thresholdDays)
  );
  return Object.fromEntries(
    scanFreshnessMetrics.value.map((metric) => [metric.key, metric])
  );
}

describe("useScanFreshnessInsights", () => {
  it("buckets boards into fresh, stale, and never with percentages", () => {
    const boards = [
      makeBoard(new Date().toISOString()),
      makeBoard(new Date(Date.now() - 400 * DAY_MS).toISOString()),
      makeBoard(null)
    ];
    const metrics = metricsByKey(boards, 180);

    expect(metrics.fresh.count).toBe(1);
    expect(metrics.stale.count).toBe(1);
    expect(metrics.never.count).toBe(1);
    expect(metrics.fresh.percent).toBe(33);
  });

  it("treats a scan exactly inside the threshold as fresh", () => {
    const boards = [makeBoard(new Date(Date.now() - 10 * DAY_MS).toISOString())];
    const metrics = metricsByKey(boards, 180);

    expect(metrics.fresh.count).toBe(1);
    expect(metrics.stale.count).toBe(0);
  });

  it("reports the latest scan date, or a fallback when there are none", () => {
    const withScan = useScanFreshnessInsights(
      ref([makeBoard(new Date().toISOString())]),
      ref(180)
    );
    const empty = useScanFreshnessInsights(ref<Board[]>([]), ref(180));

    expect(withScan.latestScanDate.value).not.toBe("No scans yet");
    expect(empty.latestScanDate.value).toBe("No scans yet");
  });
});
