import { computed, type Ref } from "vue";
import type { Board } from "../../../shared/types/board";
import {
  formatScanFreshnessThresholdDetail,
  getScanFreshnessCutoffMs
} from "../../services/scanFreshnessThreshold";
import { parseDateMs } from "../../utils/dateValue";
import { formatDate } from "../../utils/boardDisplay";

export interface ScanFreshnessMetric {
  key: string;
  label: string;
  detail: string;
  count: number;
  percent: number;
  color: string;
}

export function useScanFreshnessInsights(
  boards: Ref<Board[]>,
  scanFreshnessThresholdDays: Ref<number>
) {
  const scanFreshnessMetrics = computed<ScanFreshnessMetric[]>(() => {
    const total = boards.value.length;
    const freshCutoffMs = getScanFreshnessCutoffMs(
      Date.now(),
      scanFreshnessThresholdDays.value
    );
    let fresh = 0;
    let stale = 0;
    let never = 0;

    for (const board of boards.value) {
      const scannedAt = parseDateMs(board.lastScannedAt);

      if (scannedAt === null) {
        never += 1;
        continue;
      }

      if (scannedAt >= freshCutoffMs) {
        fresh += 1;
      } else {
        stale += 1;
      }
    }

    return [
      {
        key: "fresh",
        label: "Fresh scans",
        detail: formatScanFreshnessThresholdDetail(
          scanFreshnessThresholdDays.value
        ),
        count: fresh,
        percent: getPercent(fresh, total),
        color: "#2dd4bf"
      },
      {
        key: "stale",
        label: "Stale scans",
        detail: "Older scan data",
        count: stale,
        percent: getPercent(stale, total),
        color: "#f59e0b"
      },
      {
        key: "never",
        label: "Never scanned",
        detail: "Manual or unknown",
        count: never,
        percent: getPercent(never, total),
        color: "#94a3b8"
      }
    ];
  });
  const latestScanDate = computed(() => {
    const latest = Math.max(
      ...boards.value
        .map((board) => parseDateMs(board.lastScannedAt))
        .filter((value): value is number => value !== null)
    );

    return Number.isFinite(latest)
      ? formatDate(new Date(latest).toISOString())
      : "No scans yet";
  });

  return {
    scanFreshnessMetrics,
    latestScanDate
  };
}

function getPercent(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}
