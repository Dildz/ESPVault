import { computed, type Ref } from "vue";
import type { Board } from "../../../shared/types/board";
import type { Project, ProjectChecklistItem } from "../../../shared/types/inventory";
import { parseDateMs } from "../../utils/dateValue";

export interface ActivityHeatmapDay {
  count: number;
  date: Date;
  events: string[];
  future: boolean;
  isoDate: string;
  level: number;
}

export interface ActivityHeatmapWeek {
  days: ActivityHeatmapDay[];
  key: string;
  monthLabel: string | null;
}

const ACTIVITY_HEATMAP_WEEKS = 26;

export const activityHeatmapLevels = [0, 1, 2, 3, 4];
export const activityHeatmapWeekdayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

export function useActivityHeatmap(
  boards: Ref<Board[]>,
  projects: Ref<Project[]>,
  checklistItems: Ref<ProjectChecklistItem[]>
) {
  const activityEventsByDate = computed(() => {
    const events = new Map<string, string[]>();

    for (const board of boards.value) {
      addActivityEvent(events, board.createdAt, "Board added");
      addActivityEvent(events, board.lastScannedAt, "Board scanned");

      if (board.lastConnectedAt !== board.lastScannedAt) {
        addActivityEvent(events, board.lastConnectedAt, "Board connected");
      }

      if (
        board.updatedAt !== board.createdAt &&
        board.updatedAt !== board.lastScannedAt
      ) {
        addActivityEvent(events, board.updatedAt, "Board updated");
      }
    }

    for (const project of projects.value) {
      addActivityEvent(events, project.createdAt, "Project created");

      if (project.updatedAt !== project.createdAt) {
        addActivityEvent(events, project.updatedAt, "Project updated");
      }
    }

    for (const item of checklistItems.value) {
      addActivityEvent(events, item.createdAt, "Checklist item added");
      addActivityEvent(events, item.completedAt, "Checklist item completed");

      if (
        item.updatedAt !== item.createdAt &&
        item.updatedAt !== item.completedAt
      ) {
        addActivityEvent(events, item.updatedAt, "Checklist item updated");
      }
    }

    return events;
  });
  const activityHeatmapWeeks = computed<ActivityHeatmapWeek[]>(() => {
    const today = startOfLocalDay(new Date());
    const currentWeekStart = addDays(today, -today.getDay());
    const firstWeekStart = addDays(
      currentWeekStart,
      -(ACTIVITY_HEATMAP_WEEKS - 1) * 7
    );

    return Array.from({ length: ACTIVITY_HEATMAP_WEEKS }, (_, weekIndex) => {
      const weekStart = addDays(firstWeekStart, weekIndex * 7);
      const previousWeekStart =
        weekIndex > 0 ? addDays(firstWeekStart, (weekIndex - 1) * 7) : null;

      return {
        days: Array.from({ length: 7 }, (_dayValue, dayIndex) => {
          const date = addDays(weekStart, dayIndex);
          const isoDate = toLocalDateKey(date);
          const future = date.getTime() > today.getTime();
          const events = future ? [] : activityEventsByDate.value.get(isoDate) ?? [];
          const count = events.length;

          return {
            count,
            date,
            events,
            future,
            isoDate,
            level: future ? 0 : getActivityHeatmapLevel(count)
          };
        }),
        key: toLocalDateKey(weekStart),
        monthLabel: getActivityHeatmapMonthLabel(weekStart, previousWeekStart)
      };
    });
  });
  const activityHeatmapDays = computed(() =>
    activityHeatmapWeeks.value.flatMap((week) => week.days)
  );
  const activityHeatmapTotal = computed(() =>
    activityHeatmapDays.value.reduce((total, day) => total + day.count, 0)
  );
  const activityHeatmapActiveDays = computed(
    () => activityHeatmapDays.value.filter((day) => day.count > 0).length
  );
  const activityHeatmapBusiestDay = computed(() =>
    activityHeatmapDays.value.reduce<ActivityHeatmapDay | null>(
      (busiestDay, day) =>
        !day.future && day.count > (busiestDay?.count ?? 0) ? day : busiestDay,
      null
    )
  );
  const hasVaultActivity = computed(() => activityHeatmapTotal.value > 0);

  function formatActivityHeatmapBusiestDay(): string {
    const day = activityHeatmapBusiestDay.value;

    if (!day || day.count === 0) {
      return "No activity yet";
    }

    return `${formatActivityHeatmapDate(day.date)} / ${day.count} ${formatActivityEventCount(day.count)}`;
  }

  return {
    ACTIVITY_HEATMAP_WEEKS,
    activityHeatmapLevels,
    activityHeatmapWeekdayLabels,
    activityHeatmapWeeks,
    activityHeatmapTotal,
    activityHeatmapActiveDays,
    hasVaultActivity,
    formatActivityHeatmapTooltip,
    formatActivityHeatmapBusiestDay
  };
}

function addActivityEvent(
  events: Map<string, string[]>,
  value: string | null,
  label: string
): void {
  const dateMs = parseDateMs(value);

  if (dateMs === null) {
    return;
  }

  const dateKey = toLocalDateKey(new Date(dateMs));
  events.set(dateKey, [...(events.get(dateKey) ?? []), label]);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return startOfLocalDay(nextDate);
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getActivityHeatmapLevel(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function getActivityHeatmapMonthLabel(
  weekStart: Date,
  previousWeekStart: Date | null
): string | null {
  const weekMidpoint = addDays(weekStart, 3);
  const previousWeekMidpoint = previousWeekStart
    ? addDays(previousWeekStart, 3)
    : null;

  if (
    previousWeekMidpoint &&
    previousWeekMidpoint.getMonth() === weekMidpoint.getMonth()
  ) {
    return null;
  }

  return formatActivityHeatmapMonth(weekMidpoint);
}

function formatActivityHeatmapMonth(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short" });
}

function formatActivityHeatmapDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function formatActivityHeatmapTooltip(day: ActivityHeatmapDay): string {
  const dateLabel = formatActivityHeatmapDate(day.date);

  if (day.future) {
    return `${dateLabel}: Not tracked yet`;
  }

  if (day.count === 0) {
    return `${dateLabel}: No vault activity`;
  }

  const uniqueEvents = Array.from(new Set(day.events));
  const visibleEvents = uniqueEvents.slice(0, 3).join(", ");
  const hiddenEventCount = Math.max(uniqueEvents.length - 3, 0);
  const eventSummary = hiddenEventCount
    ? `${visibleEvents}, +${hiddenEventCount} more`
    : visibleEvents;

  return `${dateLabel}: ${day.count} ${formatActivityEventCount(
    day.count
  )} (${eventSummary})`;
}

function formatActivityEventCount(count: number): string {
  return `event${count === 1 ? "" : "s"}`;
}
