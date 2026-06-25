import { describe, expect, it } from "vitest";
import { ref } from "vue";
import type { Board } from "../../../shared/types/board";
import type { Project, ProjectChecklistItem } from "../../../shared/types/inventory";
import { useProjectInsights } from "./useProjectInsights";

function makeProject(over: Partial<Project>): Project {
  return { id: "p", name: "Project", status: "active", ...over } as unknown as Project;
}

function makeBoard(over: Partial<Board>): Board {
  return { id: "b", status: "available", projectId: null, ...over } as unknown as Board;
}

function makeItem(over: Partial<ProjectChecklistItem>): ProjectChecklistItem {
  return { id: "i", projectId: "p", completed: false, ...over } as unknown as ProjectChecklistItem;
}

function insights(
  projects: Project[],
  boards: Board[] = [],
  items: ProjectChecklistItem[] = []
) {
  return useProjectInsights(ref(boards), ref(projects), ref(items));
}

describe("useProjectInsights", () => {
  it("reports empty insights for no projects", () => {
    const p = insights([]);

    expect(p.activeProjects.value).toBe(0);
    expect(p.projectCoveragePercent.value).toBe(0);
    expect(p.projectStatusMetrics.value).toEqual([]);
    expect(p.projectInsightMetrics.value).toEqual([]);
    expect(p.projectsNeedingAttention.value).toBe(0);
  });

  it("counts active projects, coverage, and open checklist items", () => {
    const p = insights(
      [
        makeProject({ id: "p1", status: "active" }),
        makeProject({ id: "p2", status: "completed" })
      ],
      [makeBoard({ id: "b1", projectId: "p1" })],
      [
        makeItem({ projectId: "p1", completed: false }),
        makeItem({ projectId: "p1", completed: true })
      ]
    );

    expect(p.activeProjects.value).toBe(1);
    // 1 of 2 projects has a board
    expect(p.projectCoveragePercent.value).toBe(50);
    expect(p.openProjectChecklistItems.value).toBe(1);
  });

  it("only includes non-empty statuses in the chart metrics", () => {
    const p = insights([
      makeProject({ id: "a", status: "active" }),
      makeProject({ id: "b", status: "active" }),
      makeProject({ id: "c", status: "needs_repair" })
    ]);
    const byStatus = Object.fromEntries(
      p.projectStatusMetrics.value.map((m) => [m.status, m.count])
    );

    expect(byStatus.active).toBe(2);
    expect(byStatus.needs_repair).toBe(1);
    expect(byStatus.completed).toBeUndefined();
  });

  it("flags projects that need attention and sorts them first", () => {
    const p = insights(
      [
        makeProject({ id: "calm", name: "Calm", status: "active" }),
        makeProject({ id: "repair", name: "Repair", status: "needs_repair" })
      ],
      [makeBoard({ id: "b", projectId: "repair", status: "broken" })]
    );

    expect(p.projectsNeedingAttention.value).toBe(1);
    // the project with an attention board sorts ahead of the calm one
    expect(p.projectInsightMetrics.value[0].project.id).toBe("repair");
  });

  it("derives checklist percent, color, and label from a metric", () => {
    const repair = {
      project: makeProject({ status: "needs_repair" }),
      assignedBoards: 1,
      attentionBoards: 1,
      openChecklistItems: 1,
      totalChecklistItems: 4
    };
    const p = insights([]);

    expect(p.projectChecklistPercent(repair)).toBe(75);
    expect(p.projectInsightColor(repair)).toBe("warning");
    expect(p.projectInsightLabel(repair)).toContain("need attention");
  });
});
