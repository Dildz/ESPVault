import { computed, type Ref } from "vue";
import type { Board } from "../../../shared/types/board";

export interface MemoryInventoryMetric {
  key: string;
  label: string;
  bytes: number;
  knownBoards: number;
  color: string;
}

const memoryPalette = {
  flash: "#2dd4bf",
  psram: "#a78bfa"
};

export function useMemoryInsights(boards: Ref<Board[]>) {
  const totalFlashBytes = computed(() =>
    boards.value.reduce((total, board) => total + (board.flashSizeBytes ?? 0), 0)
  );
  const totalPsramBytes = computed(() =>
    boards.value.reduce((total, board) => total + (board.psramSizeBytes ?? 0), 0)
  );
  const boardsWithKnownFlash = computed(
    () => boards.value.filter((board) => board.flashSizeBytes !== null).length
  );
  const boardsWithKnownPsram = computed(
    () => boards.value.filter((board) => board.psramSizeBytes !== null).length
  );
  const totalKnownMemoryBytes = computed(
    () => totalFlashBytes.value + totalPsramBytes.value
  );
  const memoryInventoryMetrics = computed<MemoryInventoryMetric[]>(() => [
    {
      key: "flash",
      label: "Flash",
      bytes: totalFlashBytes.value,
      knownBoards: boardsWithKnownFlash.value,
      color: memoryPalette.flash
    },
    {
      key: "psram",
      label: "PSRAM",
      bytes: totalPsramBytes.value,
      knownBoards: boardsWithKnownPsram.value,
      color: memoryPalette.psram
    }
  ]);
  const hasKnownMemory = computed(() =>
    memoryInventoryMetrics.value.some((metric) => metric.bytes > 0)
  );
  const knownMemoryChartKey = computed(() =>
    memoryInventoryMetrics.value
      .map((metric) => `${metric.key}:${metric.bytes}:${metric.knownBoards}`)
      .join("|")
  );
  const psramEquippedBoards = computed(
    () =>
      boards.value.filter(
        (board) =>
          (board.psramSizeBytes !== null && board.psramSizeBytes > 0) ||
          board.psramDetected === true
      ).length
  );
  const averageFlashBytes = computed(() =>
    boardsWithKnownFlash.value > 0
      ? Math.round(totalFlashBytes.value / boardsWithKnownFlash.value)
      : 0
  );
  const largestFlashBoard = computed(() =>
    boards.value
      .filter(
        (board): board is Board & { flashSizeBytes: number } =>
          board.flashSizeBytes !== null && board.flashSizeBytes > 0
      )
      .sort((left, right) => right.flashSizeBytes - left.flashSizeBytes)[0] ?? null
  );

  return {
    totalFlashBytes,
    totalPsramBytes,
    boardsWithKnownFlash,
    boardsWithKnownPsram,
    totalKnownMemoryBytes,
    memoryInventoryMetrics,
    hasKnownMemory,
    knownMemoryChartKey,
    psramEquippedBoards,
    averageFlashBytes,
    largestFlashBoard
  };
}
