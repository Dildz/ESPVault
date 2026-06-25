import { describe, expect, it } from "vitest";
import { ref } from "vue";
import type { Board } from "../../../shared/types/board";
import { useChipFamilyInsights } from "./useChipFamilyInsights";

function makeBoard(over: Partial<Board>): Board {
  return { chipModel: null, chipFamilyHex: null, ...over } as unknown as Board;
}

describe("useChipFamilyInsights", () => {
  it("reports no chip data for an empty vault", () => {
    const c = useChipFamilyInsights(ref<Board[]>([]));

    expect(c.chipFamilyMetrics.value).toEqual([]);
    expect(c.chipFamilyCount.value).toBe(0);
    expect(c.dominantChipFamily.value).toBe("No chip data");
  });

  it("counts by chip family and sorts by count then label", () => {
    const c = useChipFamilyInsights(
      ref([
        makeBoard({ chipModel: "ESP32" }),
        makeBoard({ chipModel: "ESP32" }),
        makeBoard({ chipModel: "ESP32" }),
        makeBoard({ chipModel: "ESP32-S3" }),
        makeBoard({ chipModel: null, chipFamilyHex: "0x09" })
      ])
    );

    expect(c.dominantChipFamily.value).toBe("ESP32");
    expect(c.chipFamilyCount.value).toBe(3);
    // ties (count 1) break by label ascending: "0x09" < "ESP32-S3"
    expect(c.chipFamilyMetrics.value.map((m) => m.label)).toEqual([
      "ESP32",
      "0x09",
      "ESP32-S3"
    ]);
    expect(c.chipFamilyMetrics.value[0].count).toBe(3);
  });

  it("falls back to chipFamilyHex then Unknown, and caps the chart at 7", () => {
    const families = ["a", "b", "c", "d", "e", "f", "g", "h"].map((label) =>
      makeBoard({ chipModel: label })
    );
    const c = useChipFamilyInsights(
      ref([...families, makeBoard({})])
    );

    expect(
      c.chipFamilyMetrics.value.some((m) => m.label === "Unknown")
    ).toBe(true);
    expect(c.chipFamilyChartMetrics.value).toHaveLength(7);
    expect(c.chipFamilyMetrics.value).toHaveLength(9);
  });
});
