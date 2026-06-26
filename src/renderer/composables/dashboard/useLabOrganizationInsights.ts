import { computed, type Ref } from "vue";
import type { Board } from "../../../shared/types/board";
import type { Project } from "../../../shared/types/inventory";
import { PROJECT_STATUS_LABELS } from "../../stores/projectStore";

export interface LabOrganizationMetric {
  key: string;
  label: string;
  detail: string;
  availableCount: number;
  inUseCount: number;
  attentionCount: number;
  archivedCount: number;
  total: number;
}

export const labOrganizationPalette = {
  available: "#22c55e",
  inUse: "#38bdf8",
  attention: "#f59e0b",
  archived: "#94a3b8"
};

function getPercent(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function createLabOrganizationMetric(
  key: string,
  label: string,
  detail: string
): LabOrganizationMetric {
  return {
    key,
    label,
    detail,
    availableCount: 0,
    inUseCount: 0,
    attentionCount: 0,
    archivedCount: 0,
    total: 0
  };
}

function countLabOrganizationBoard(metric: LabOrganizationMetric, board: Board): void {
  metric.total += 1;

  if (board.status === "available") {
    metric.availableCount += 1;
    return;
  }

  if (board.status === "in_use") {
    metric.inUseCount += 1;
    return;
  }

  if (board.status === "archived") {
    metric.archivedCount += 1;
    return;
  }

  metric.attentionCount += 1;
}

export function useLabOrganizationInsights(
  boards: Ref<Board[]>,
  projects: Ref<Project[]>,
  totalBoards: Ref<number>
) {
  const unassignedBoards = computed(
    () => boards.value.filter((board) => !board.projectId).length
  );
  const assignedBoards = computed(() =>
    Math.max(totalBoards.value - unassignedBoards.value, 0)
  );
  const organizedBoardPercent = computed(() =>
    getPercent(assignedBoards.value, totalBoards.value)
  );
  const projectGroupsInUse = computed(
    () =>
      new Set(
        boards.value
          .map((board) => board.projectId)
          .filter((projectId): projectId is string => Boolean(projectId))
      ).size
  );
  const labOrganizationMetrics = computed<LabOrganizationMetric[]>(() => {
    const metrics = new Map<string, LabOrganizationMetric>();
    const projectMap = new Map(projects.value.map((project) => [project.id, project]));

    for (const board of boards.value) {
      const project = board.projectId ? projectMap.get(board.projectId) : null;
      const key = project?.id ?? (board.projectId ? `missing-${board.projectId}` : "unassigned");
      const metric =
        metrics.get(key) ??
        createLabOrganizationMetric(
          key,
          project?.name ?? (board.projectId ? "Missing project" : "Unassigned"),
          project?.location ??
            (project
              ? PROJECT_STATUS_LABELS[project.status]
              : board.projectId
                ? "Detached board"
                : "Needs project")
        );

      countLabOrganizationBoard(metric, board);
      metrics.set(key, metric);
    }

    return Array.from(metrics.values())
      .sort((left, right) => {
        if (left.key === "unassigned" && right.key !== "unassigned") return -1;
        if (right.key === "unassigned" && left.key !== "unassigned") return 1;
        return right.total - left.total || left.label.localeCompare(right.label);
      })
      .slice(0, 5);
  });
  const labOrganizationChartKey = computed(() =>
    labOrganizationMetrics.value
      .map(
        (metric) =>
          `${metric.key}:${metric.label}:${metric.detail}:${metric.availableCount}:${metric.inUseCount}:${metric.attentionCount}:${metric.archivedCount}`
      )
      .join("|")
  );

  return {
    unassignedBoards,
    assignedBoards,
    organizedBoardPercent,
    projectGroupsInUse,
    labOrganizationMetrics,
    labOrganizationChartKey
  };
}
