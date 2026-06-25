import { describe, expect, it } from "vitest";
import { ref } from "vue";
import type { Board } from "../../../shared/types/board";
import { useBoardStateInsights } from "./useBoardStateInsights";

function makeBoard(status: Board["status"]): Board {
  return { status } as unknown as Board;
}

describe("useBoardStateInsights", () => {
  it("emits all statuses in a fixed order with zero counts when empty", () => {
    const b = useBoardStateInsights(ref<Board[]>([]));

    expect(b.boardStateMetrics.value.map((m) => m.status)).toEqual([
      "available",
      "in_use",
      "needs_flashing",
      "broken",
      "unknown",
      "archived"
    ]);
    expect(b.boardStateMetrics.value.every((m) => m.count === 0)).toBe(true);
    expect(b.boardStateMetrics.value[0].displayLabel).toBe(
      b.boardStateMetrics.value[0].label.toLocaleLowerCase()
    );
  });

  it("counts by status", () => {
    const b = useBoardStateInsights(
      ref([
        makeBoard("available"),
        makeBoard("available"),
        makeBoard("broken"),
        makeBoard("archived")
      ])
    );
    const byStatus = Object.fromEntries(
      b.boardStateMetrics.value.map((m) => [m.status, m.count])
    );

    expect(byStatus.available).toBe(2);
    expect(byStatus.broken).toBe(1);
    expect(byStatus.archived).toBe(1);
    expect(byStatus.in_use).toBe(0);
  });

  it("always shows available/in_use/broken, plus any non-empty status", () => {
    const empty = useBoardStateInsights(ref<Board[]>([]));
    expect(empty.visibleBoardStateMetrics.value.map((m) => m.status)).toEqual([
      "available",
      "in_use",
      "broken"
    ]);

    const withArchived = useBoardStateInsights(ref([makeBoard("archived")]));
    const visible = withArchived.visibleBoardStateMetrics.value.map(
      (m) => m.status
    );
    expect(visible).toContain("archived");
    expect(visible).not.toContain("needs_flashing");
  });

  it("builds a chart key from status counts", () => {
    const b = useBoardStateInsights(ref([makeBoard("available")]));

    expect(b.boardStateChartKey.value).toContain("available:1");
    expect(b.boardStateChartKey.value).toContain("broken:0");
  });
});
