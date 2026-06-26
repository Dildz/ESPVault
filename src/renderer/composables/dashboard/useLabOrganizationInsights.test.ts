import { describe, expect, it } from "vitest";
import { computed, ref } from "vue";
import type { Board } from "../../../shared/types/board";
import type { Project } from "../../../shared/types/inventory";
import { useLabOrganizationInsights } from "./useLabOrganizationInsights";

function makeBoard(status: Board["status"], projectId?: string): Board {
  return { status, projectId } as unknown as Board;
}

function makeProject(id: string, name: string, location?: string): Project {
  return { id, name, location, status: "active" } as unknown as Project;
}

function setup(boards: Board[], projects: Project[] = []) {
  const boardsRef = ref(boards);
  const totalBoards = computed(() => boardsRef.value.length);
  return useLabOrganizationInsights(boardsRef, ref(projects), totalBoards);
}

describe("useLabOrganizationInsights", () => {
  it("counts assigned vs unassigned boards", () => {
    const i = setup([
      makeBoard("available", "p1"),
      makeBoard("in_use", "p1"),
      makeBoard("available")
    ]);

    expect(i.unassignedBoards.value).toBe(1);
    expect(i.assignedBoards.value).toBe(2);
    expect(i.organizedBoardPercent.value).toBe(67);
  });

  it("counts distinct project groups in use", () => {
    const i = setup([
      makeBoard("available", "p1"),
      makeBoard("available", "p1"),
      makeBoard("available", "p2"),
      makeBoard("available")
    ]);

    expect(i.projectGroupsInUse.value).toBe(2);
  });

  it("buckets board statuses per metric and sorts unassigned first", () => {
    const i = setup(
      [
        makeBoard("available", "p1"),
        makeBoard("in_use", "p1"),
        makeBoard("broken", "p1"),
        makeBoard("archived", "p1"),
        makeBoard("available")
      ],
      [makeProject("p1", "Weather Station", "Garage")]
    );

    const [first, second] = i.labOrganizationMetrics.value;
    expect(first.key).toBe("unassigned");
    expect(second.label).toBe("Weather Station");
    expect(second.detail).toBe("Garage");
    expect(second.availableCount).toBe(1);
    expect(second.inUseCount).toBe(1);
    expect(second.archivedCount).toBe(1);
    expect(second.attentionCount).toBe(1);
    expect(second.total).toBe(4);
  });

  it("labels boards pointing at a missing project as detached", () => {
    const i = setup([makeBoard("available", "ghost")]);
    const metric = i.labOrganizationMetrics.value[0];

    expect(metric.label).toBe("Missing project");
    expect(metric.detail).toBe("Detached board");
  });

  it("caps metrics at five and builds a chart key", () => {
    const projects = Array.from({ length: 6 }, (_, n) =>
      makeProject(`p${n}`, `Project ${n}`, `Loc ${n}`)
    );
    const boards = projects.map((p) => makeBoard("available", p.id));
    const i = setup(boards, projects);

    expect(i.labOrganizationMetrics.value).toHaveLength(5);
    expect(i.labOrganizationChartKey.value).toContain(":1");
  });
});
