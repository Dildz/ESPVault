import { computed, type Ref } from "vue";
import type { Board } from "../../../shared/types/board";

export function useChipFamilyInsights(boards: Ref<Board[]>) {
  const chipFamilyMetrics = computed(() => {
    const counts = new Map<string, number>();

    for (const board of boards.value) {
      const chipFamily = formatChipFamily(board);
      counts.set(chipFamily, (counts.get(chipFamily) ?? 0) + 1);
    }

    return Array.from(counts, ([label, count]) => ({ label, count })).sort(
      (left, right) => right.count - left.count || left.label.localeCompare(right.label)
    );
  });
  const chipFamilyChartMetrics = computed(() => chipFamilyMetrics.value.slice(0, 7));
  const dominantChipFamily = computed(
    () => chipFamilyMetrics.value[0]?.label ?? "No chip data"
  );
  const chipFamilyCount = computed(() => chipFamilyMetrics.value.length);

  return {
    chipFamilyMetrics,
    chipFamilyChartMetrics,
    dominantChipFamily,
    chipFamilyCount
  };
}

function formatChipFamily(board: Board): string {
  return board.chipModel?.trim() || board.chipFamilyHex || "Unknown";
}
