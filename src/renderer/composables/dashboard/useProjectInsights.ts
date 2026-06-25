import { computed, type Ref } from "vue";
import type { Board } from "../../../shared/types/board";
import {
  PROJECT_STATUSES,
  type Project,
  type ProjectChecklistItem,
  type ProjectStatus
} from "../../../shared/types/inventory";
import { PROJECT_STATUS_LABELS } from "../../stores/projectStore";

export interface ProjectStatusMetric {
  status: ProjectStatus;
  label: string;
  count: number;
  color: string;
}

export interface ProjectInsightMetric {
  project: Project;
  assignedBoards: number;
  attentionBoards: number;
  openChecklistItems: number;
  totalChecklistItems: number;
}

const projectStatusPalette: Record<ProjectStatus, string> = {
  active: "#2dd4bf",
  needs_repair: "#fb7185",
  on_hold: "#f59e0b",
  completed: "#38bdf8",
  archived: "#94a3b8"
};

export function useProjectInsights(
  boards: Ref<Board[]>,
  projects: Ref<Project[]>,
  checklistItems: Ref<ProjectChecklistItem[]>
) {
  const activeProjects = computed(
    () => projects.value.filter((project) => project.status === "active").length
  );
  const projectsWithBoards = computed(
    () =>
      projects.value.filter((project) =>
        boards.value.some((board) => board.projectId === project.id)
      ).length
  );
  const projectCoveragePercent = computed(() =>
    getPercent(projectsWithBoards.value, projects.value.length)
  );
  const openProjectChecklistItems = computed(
    () => checklistItems.value.filter((item) => !item.completed).length
  );
  const projectStatusMetrics = computed<ProjectStatusMetric[]>(() =>
    PROJECT_STATUSES.map((status) => ({
      status,
      label: PROJECT_STATUS_LABELS[status],
      count: projects.value.filter((project) => project.status === status).length,
      color: projectStatusPalette[status]
    })).filter((metric) => metric.count > 0)
  );
  const projectStatusChartKey = computed(() =>
    projectStatusMetrics.value
      .map((metric) => `${metric.status}:${metric.count}`)
      .join("|")
  );
  const allProjectInsightMetrics = computed<ProjectInsightMetric[]>(() =>
    projects.value
      .map((project) => {
        const projectBoards = boards.value.filter(
          (board) => board.projectId === project.id
        );
        const projectChecklistItems = checklistItems.value.filter(
          (item) => item.projectId === project.id
        );

        return {
          project,
          assignedBoards: projectBoards.length,
          attentionBoards: projectBoards.filter((board) =>
            ["broken", "needs_flashing", "unknown"].includes(board.status)
          ).length,
          openChecklistItems: projectChecklistItems.filter((item) => !item.completed)
            .length,
          totalChecklistItems: projectChecklistItems.length
        };
      })
      .sort(
        (left, right) =>
          right.attentionBoards - left.attentionBoards ||
          right.openChecklistItems - left.openChecklistItems ||
          right.assignedBoards - left.assignedBoards ||
          left.project.name.localeCompare(right.project.name)
      )
  );
  const projectInsightMetrics = computed<ProjectInsightMetric[]>(() =>
    allProjectInsightMetrics.value.slice(0, 4)
  );
  const projectsNeedingAttention = computed(
    () =>
      allProjectInsightMetrics.value.filter(
        (metric) =>
          metric.project.status === "needs_repair" ||
          metric.attentionBoards > 0 ||
          metric.openChecklistItems > 0
      ).length
  );

  function projectChecklistPercent(metric: ProjectInsightMetric): number {
    return getPercent(
      metric.totalChecklistItems - metric.openChecklistItems,
      metric.totalChecklistItems
    );
  }

  return {
    activeProjects,
    projectsWithBoards,
    projectCoveragePercent,
    openProjectChecklistItems,
    projectStatusMetrics,
    projectStatusChartKey,
    allProjectInsightMetrics,
    projectInsightMetrics,
    projectsNeedingAttention,
    projectChecklistPercent,
    projectInsightColor,
    projectInsightLabel
  };
}

function projectInsightColor(metric: ProjectInsightMetric): string {
  if (metric.project.status === "needs_repair" || metric.attentionBoards > 0) {
    return "warning";
  }

  if (metric.openChecklistItems > 0) {
    return "info";
  }

  return "success";
}

function projectInsightLabel(metric: ProjectInsightMetric): string {
  if (metric.attentionBoards > 0) {
    return `${metric.attentionBoards} board${metric.attentionBoards === 1 ? "" : "s"} need attention`;
  }

  if (metric.openChecklistItems > 0) {
    return `${metric.openChecklistItems} open task${metric.openChecklistItems === 1 ? "" : "s"}`;
  }

  return "On track";
}

function getPercent(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}
