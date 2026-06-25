import { describe, expect, it } from "vitest";
import { ref } from "vue";
import type { Board } from "../../../shared/types/board";
import type { BoardPartition } from "../../../shared/types/partition";
import { usePartitionInsights } from "./usePartitionInsights";

const MB = 0x100000;

function partition(over: Partial<BoardPartition>): BoardPartition {
  return {
    label: "",
    type: 0,
    typeHex: "",
    subtype: 0,
    subtypeHex: "",
    offset: 0,
    offsetHex: "",
    sizeBytes: 0,
    sizeHex: "",
    flags: 0,
    flagsHex: "",
    filesystem: null,
    ...over
  };
}

function makeBoard(over: Partial<Board>): Board {
  return {
    id: "b1",
    flashSizeBytes: null,
    partitionTableOffset: null,
    partitionTableReadError: null,
    partitions: null,
    ...over
  } as unknown as Board;
}

// A 4MB board: otadata + two OTA app slots + a LittleFS data partition.
const otaBoard = makeBoard({
  flashSizeBytes: 4 * MB,
  partitions: [
    partition({ type: 0x01, subtype: 0x00, sizeBytes: 0x2000 }), // otadata
    partition({ type: 0x00, subtype: 0x10, sizeBytes: MB }), // ota_0
    partition({ type: 0x00, subtype: 0x11, sizeBytes: MB }), // ota_1
    partition({ type: 0x01, subtype: 0x83, sizeBytes: MB }) // littlefs
  ]
});

describe("usePartitionInsights", () => {
  it("reports zeros for an empty vault", () => {
    const p = usePartitionInsights(ref<Board[]>([]));

    expect(p.partitionInsights.value.boardsWithPartitions).toBe(0);
    expect(p.partitionedFlashPercent.value).toBe(0);
    expect(p.otaReadyPercent.value).toBe(0);
    expect(p.averagePartitionsPerBoard.value).toBe("0");
    expect(p.partitionInsights.value.topOpenFlashBoards).toHaveLength(0);
  });

  it("aggregates partition rows, bytes, OTA readiness, and filesystems", () => {
    const p = usePartitionInsights(ref([otaBoard]));
    const insights = p.partitionInsights.value;

    expect(insights.boardsWithPartitions).toBe(1);
    expect(insights.partitionRows).toBe(4);
    expect(insights.partitionedBytes).toBe(3 * MB + 0x2000);
    // 4MB - reserved(0x9000) - partitioned
    expect(insights.openBytes).toBe(4 * MB - 0x9000 - (3 * MB + 0x2000));
    expect(insights.otaReadyBoards).toBe(1);
    expect(p.otaReadyPercent.value).toBe(100);
    expect(p.averagePartitionsPerBoard.value).toBe("4.0");

    expect(insights.filesystemMetrics).toHaveLength(1);
    expect(insights.filesystemMetrics[0].key).toBe("littlefs");
    expect(insights.filesystemMetrics[0].bytes).toBe(MB);
  });

  it("separates read failures from boards that simply have no partition table", () => {
    const p = usePartitionInsights(
      ref([
        makeBoard({ id: "failed", partitionTableReadError: "Read failed" }),
        makeBoard({ id: "missing" })
      ])
    );
    const insights = p.partitionInsights.value;

    expect(insights.boardsWithPartitions).toBe(0);
    expect(insights.failedBoards).toBe(1);
    expect(insights.missingBoards).toBe(1);
  });

  it("does not count a single OTA app slot as OTA ready", () => {
    const oneSlot = makeBoard({
      flashSizeBytes: 4 * MB,
      partitions: [
        partition({ type: 0x01, subtype: 0x00, sizeBytes: 0x2000 }),
        partition({ type: 0x00, subtype: 0x10, sizeBytes: MB })
      ]
    });
    const p = usePartitionInsights(ref([oneSlot]));

    expect(p.partitionInsights.value.otaReadyBoards).toBe(0);
  });
});
