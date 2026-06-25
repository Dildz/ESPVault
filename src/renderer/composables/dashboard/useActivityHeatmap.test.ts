import { describe, expect, it } from "vitest";
import { ref } from "vue";
import type { Board } from "../../../shared/types/board";
import type { Project, ProjectChecklistItem } from "../../../shared/types/inventory";
import {
  formatActivityHeatmapTooltip,
  useActivityHeatmap,
  type ActivityHeatmapDay
} from "./useActivityHeatmap";

const NOW = new Date().toISOString();

function makeBoard(dates: Partial<Board>): Board {
  return {
    createdAt: null,
    updatedAt: null,
    lastScannedAt: null,
    lastConnectedAt: null,
    ...dates
  } as unknown as Board;
}

function heatmap(boards: Board[]) {
  return useActivityHeatmap(
    ref(boards),
    ref<Project[]>([]),
    ref<ProjectChecklistItem[]>([])
  );
}

function activeDays(weeks: { days: ActivityHeatmapDay[] }[]): ActivityHeatmapDay[] {
  return weeks.flatMap((week) => week.days).filter((day) => day.count > 0);
}

describe("useActivityHeatmap", () => {
  it("reports no activity for empty inputs and spans the configured window", () => {
    const h = heatmap([]);

    expect(h.activityHeatmapTotal.value).toBe(0);
    expect(h.activityHeatmapActiveDays.value).toBe(0);
    expect(h.hasVaultActivity.value).toBe(false);
    expect(h.activityHeatmapWeeks.value).toHaveLength(h.ACTIVITY_HEATMAP_WEEKS);
    expect(h.formatActivityHeatmapBusiestDay()).toBe("No activity yet");
  });

  it("counts distinct same-day events and buckets them into a level", () => {
    // createdAt + lastScannedAt on the same day = 2 events; the other two are
    // suppressed because their guards compare equal/null.
    const h = heatmap([makeBoard({ createdAt: NOW, lastScannedAt: NOW })]);
    const active = activeDays(h.activityHeatmapWeeks.value);

    expect(h.activityHeatmapTotal.value).toBe(2);
    expect(active).toHaveLength(1);
    expect(active[0].count).toBe(2);
    expect(active[0].level).toBe(2);
    expect(h.hasVaultActivity.value).toBe(true);
  });

  it("ignores null dates", () => {
    const h = heatmap([makeBoard({ createdAt: NOW })]);

    expect(h.activityHeatmapTotal.value).toBe(1);
    expect(activeDays(h.activityHeatmapWeeks.value)[0].level).toBe(1);
  });
});

describe("formatActivityHeatmapTooltip", () => {
  const day = (over: Partial<ActivityHeatmapDay>): ActivityHeatmapDay => ({
    count: 0,
    date: new Date(2026, 0, 15),
    events: [],
    future: false,
    isoDate: "2026-01-15",
    level: 0,
    ...over
  });

  it("labels future days as not tracked", () => {
    expect(formatActivityHeatmapTooltip(day({ future: true }))).toContain(
      "Not tracked yet"
    );
  });

  it("labels empty days as no activity", () => {
    expect(formatActivityHeatmapTooltip(day({}))).toContain("No vault activity");
  });

  it("dedupes events and summarizes overflow past three", () => {
    const tooltip = formatActivityHeatmapTooltip(
      day({
        count: 5,
        events: ["A", "A", "B", "C", "D", "E"]
      })
    );

    expect(tooltip).toContain("5 events");
    expect(tooltip).toContain("A, B, C");
    expect(tooltip).toContain("+2 more");
  });
});
