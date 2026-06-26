import { describe, expect, it } from "vitest";
import { ref } from "vue";
import type { Board, BoardDashboardStats } from "../../../shared/types/board";
import { useRecentActivity } from "./useRecentActivity";

function makeBoard(id: string, dates: Partial<Board>): Board {
  return { id, name: id, status: "available", ...dates } as unknown as Board;
}

function makeStats(stats: Partial<BoardDashboardStats>): BoardDashboardStats {
  return {
    recentlyConnectedBoards: [],
    recentlyUpdatedBoards: [],
    ...stats
  } as unknown as BoardDashboardStats;
}

describe("useRecentActivity", () => {
  it("returns empty when stats are null", () => {
    const { recentActivity } = useRecentActivity(ref(null));
    expect(recentActivity.value).toEqual([]);
  });

  it("tags connection vs update items", () => {
    const { recentActivity } = useRecentActivity(
      ref(
        makeStats({
          recentlyConnectedBoards: [makeBoard("a", { lastConnectedAt: "2026-01-02" })],
          recentlyUpdatedBoards: [makeBoard("b", { updatedAt: "2026-01-01" })]
        })
      )
    );

    const byKind = Object.fromEntries(recentActivity.value.map((i) => [i.kind, i]));
    expect(byKind.Connection.label).toBe("Connected");
    expect(byKind.Connection.date).toBe("2026-01-02");
    expect(byKind["Record update"].label).toBe("Updated");
  });

  it("sorts newest first and caps at six", () => {
    const connected = Array.from({ length: 5 }, (_, n) =>
      makeBoard(`c${n}`, { lastConnectedAt: `2026-01-${10 + n}` })
    );
    const updated = Array.from({ length: 5 }, (_, n) =>
      makeBoard(`u${n}`, { updatedAt: `2026-02-${10 + n}` })
    );
    const { recentActivity } = useRecentActivity(
      ref(makeStats({ recentlyConnectedBoards: connected, recentlyUpdatedBoards: updated }))
    );

    expect(recentActivity.value).toHaveLength(6);
    const dates = recentActivity.value.map((i) => new Date(i.date ?? 0).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
    expect(recentActivity.value[0].date).toBe("2026-02-14");
  });
});
