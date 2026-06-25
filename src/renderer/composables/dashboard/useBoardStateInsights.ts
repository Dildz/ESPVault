import { computed, type Ref } from "vue";
import type { Board } from "../../../shared/types/board";
import { BOARD_STATUS_LABELS } from "../../utils/boardDisplay";

export interface BoardStateMetric {
  status: Board["status"];
  label: string;
  displayLabel: string;
  count: number;
  color: string;
}

const boardStatePalette: Record<Board["status"], string> = {
  available: "#22c55e",
  in_use: "#38bdf8",
  needs_flashing: "#f59e0b",
  broken: "#fb7185",
  archived: "#94a3b8",
  unknown: "#a78bfa"
};

const boardStatusChartOrder: Board["status"][] = [
  "available",
  "in_use",
  "needs_flashing",
  "broken",
  "unknown",
  "archived"
];

export function useBoardStateInsights(boards: Ref<Board[]>) {
  const boardStateMetrics = computed<BoardStateMetric[]>(() => {
    const counts = new Map<Board["status"], number>();

    for (const board of boards.value) {
      counts.set(board.status, (counts.get(board.status) ?? 0) + 1);
    }

    return boardStatusChartOrder.map((status) => {
      const label = BOARD_STATUS_LABELS[status];
      return {
        status,
        label,
        displayLabel: label.toLocaleLowerCase(),
        count: counts.get(status) ?? 0,
        color: boardStatePalette[status]
      };
    });
  });
  const visibleBoardStateMetrics = computed(() =>
    boardStateMetrics.value.filter(
      (metric) =>
        metric.count > 0 ||
        metric.status === "available" ||
        metric.status === "in_use" ||
        metric.status === "broken"
    )
  );
  const boardStateChartKey = computed(() =>
    boardStateMetrics.value
      .map((metric) => `${metric.status}:${metric.count}`)
      .join("|")
  );

  return {
    boardStateMetrics,
    visibleBoardStateMetrics,
    boardStateChartKey
  };
}
