import { describe, expect, it } from "vitest";
import { ref } from "vue";
import type { Board } from "../../../shared/types/board";
import { useMemoryInsights } from "./useMemoryInsights";

const MB = 0x100000;

function makeBoard(over: Partial<Board>): Board {
  return {
    id: "b",
    flashSizeBytes: null,
    psramSizeBytes: null,
    psramDetected: null,
    ...over
  } as unknown as Board;
}

describe("useMemoryInsights", () => {
  it("reports empty totals for a vault with no known memory", () => {
    const m = useMemoryInsights(ref<Board[]>([]));

    expect(m.totalFlashBytes.value).toBe(0);
    expect(m.totalKnownMemoryBytes.value).toBe(0);
    expect(m.averageFlashBytes.value).toBe(0);
    expect(m.largestFlashBoard.value).toBeNull();
    expect(m.hasKnownMemory.value).toBe(false);
    expect(m.memoryInventoryMetrics.value.map((x) => x.bytes)).toEqual([0, 0]);
  });

  it("sums flash/psram and averages only over boards with known flash", () => {
    const m = useMemoryInsights(
      ref([
        makeBoard({ id: "a", flashSizeBytes: 4 * MB, psramSizeBytes: 2 * MB }),
        makeBoard({ id: "b", flashSizeBytes: 8 * MB }),
        makeBoard({ id: "c" })
      ])
    );

    expect(m.totalFlashBytes.value).toBe(12 * MB);
    expect(m.totalPsramBytes.value).toBe(2 * MB);
    expect(m.boardsWithKnownFlash.value).toBe(2);
    expect(m.boardsWithKnownPsram.value).toBe(1);
    expect(m.averageFlashBytes.value).toBe(6 * MB);
    expect(m.totalKnownMemoryBytes.value).toBe(14 * MB);
    expect(m.largestFlashBoard.value?.id).toBe("b");
    expect(m.hasKnownMemory.value).toBe(true);
  });

  it("counts PSRAM by size or detection flag", () => {
    const m = useMemoryInsights(
      ref([
        makeBoard({ id: "size", psramSizeBytes: 2 * MB }),
        makeBoard({ id: "flag", psramDetected: true }),
        makeBoard({ id: "none" })
      ])
    );

    // psramEquipped = size>0 OR detected; boardsWithKnownPsram = size !== null
    expect(m.psramEquippedBoards.value).toBe(2);
    expect(m.boardsWithKnownPsram.value).toBe(1);
  });

  it("builds a chart key that changes with totals", () => {
    const empty = useMemoryInsights(ref<Board[]>([]));
    const filled = useMemoryInsights(
      ref([makeBoard({ flashSizeBytes: 4 * MB })])
    );

    expect(empty.knownMemoryChartKey.value).not.toBe(
      filled.knownMemoryChartKey.value
    );
  });
});
