import { computed, type Ref } from "vue";
import type { Board } from "../../../shared/types/board";
import type { BoardPartition } from "../../../shared/types/partition";

export interface FilesystemMetric {
  key: string;
  label: string;
  bytes: number;
  color: string;
}

export interface OpenFlashBoardMetric {
  board: Board;
  openBytes: number;
  partitionedBytes: number;
  openPercent: number;
}

export interface PartitionInsights {
  boardsWithPartitions: number;
  failedBoards: number;
  missingBoards: number;
  otaReadyBoards: number;
  openBytes: number;
  partitionedBytes: number;
  partitionRows: number;
  filesystemMetrics: FilesystemMetric[];
  topOpenFlashBoards: OpenFlashBoardMetric[];
}

const DEFAULT_PARTITION_TABLE_OFFSET = 0x8000;
const PARTITION_TABLE_REGION_SIZE = 0x1000;

const filesystemPalette = {
  fatfs: "#60a5fa",
  littlefs: "#38bdf8",
  spiffs: "#818cf8"
};

export function usePartitionInsights(boards: Ref<Board[]>) {
  const partitionInsights = computed<PartitionInsights>(() => {
    const filesystemBytes = new Map<string, FilesystemMetric>();
    let boardsWithPartitions = 0;
    let failedBoards = 0;
    let otaReadyBoards = 0;
    let openBytes = 0;
    let partitionedBytes = 0;
    let partitionRows = 0;
    const topOpenFlashBoards: OpenFlashBoardMetric[] = [];

    for (const board of boards.value) {
      const partitions = board.partitions ?? [];

      if (!partitions.length) {
        if (board.partitionTableReadError) {
          failedBoards += 1;
        }
        continue;
      }

      boardsWithPartitions += 1;
      partitionRows += partitions.length;

      if (isOtaReady(board)) {
        otaReadyBoards += 1;
      }

      const boardPartitionedBytes = partitions.reduce(
        (total, partition) => total + Math.max(partition.sizeBytes, 0),
        0
      );
      const boardOpenBytes = getOpenFlashBytes(board, boardPartitionedBytes);
      const denominator = boardPartitionedBytes + boardOpenBytes;

      partitionedBytes += boardPartitionedBytes;
      openBytes += boardOpenBytes;

      if (boardOpenBytes > 0) {
        topOpenFlashBoards.push({
          board,
          openBytes: boardOpenBytes,
          partitionedBytes: boardPartitionedBytes,
          openPercent: denominator > 0 ? (boardOpenBytes / denominator) * 100 : 0
        });
      }

      for (const partition of partitions) {
        const filesystem = getFilesystemMetric(partition);
        if (!filesystem) {
          continue;
        }

        const current = filesystemBytes.get(filesystem.key) ?? filesystem;
        filesystemBytes.set(filesystem.key, {
          ...current,
          bytes: current.bytes + partition.sizeBytes
        });
      }
    }

    return {
      boardsWithPartitions,
      failedBoards,
      missingBoards: Math.max(boards.value.length - boardsWithPartitions - failedBoards, 0),
      otaReadyBoards,
      openBytes,
      partitionedBytes,
      partitionRows,
      filesystemMetrics: Array.from(filesystemBytes.values()).sort(
        (left, right) => right.bytes - left.bytes
      ),
      topOpenFlashBoards: topOpenFlashBoards
        .sort((left, right) => right.openBytes - left.openBytes)
        .slice(0, 5)
    };
  });
  const partitionedFlashPercent = computed(() => {
    const total =
      partitionInsights.value.partitionedBytes + partitionInsights.value.openBytes;
    return total > 0
      ? Math.round((partitionInsights.value.partitionedBytes / total) * 100)
      : 0;
  });
  const otaReadyPercent = computed(() =>
    partitionInsights.value.boardsWithPartitions > 0
      ? Math.round(
          (partitionInsights.value.otaReadyBoards /
            partitionInsights.value.boardsWithPartitions) *
            100
        )
      : 0
  );
  const averagePartitionsPerBoard = computed(() =>
    partitionInsights.value.boardsWithPartitions > 0
      ? (
          partitionInsights.value.partitionRows /
          partitionInsights.value.boardsWithPartitions
        ).toFixed(1)
      : "0"
  );
  const partitionChartKey = computed(() => {
    const insights = partitionInsights.value;
    return [
      insights.partitionedBytes,
      insights.openBytes,
      insights.boardsWithPartitions,
      insights.failedBoards,
      insights.missingBoards,
      insights.otaReadyBoards,
      insights.filesystemMetrics
        .map((metric) => `${metric.key}:${metric.bytes}`)
        .join(","),
      insights.topOpenFlashBoards
        .map((metric) => `${metric.board.id}:${metric.openBytes}`)
        .join(",")
    ].join("|");
  });

  return {
    partitionInsights,
    partitionedFlashPercent,
    otaReadyPercent,
    averagePartitionsPerBoard,
    partitionChartKey
  };
}

function isOtaReady(board: Board): boolean {
  const partitions = board.partitions ?? [];
  const hasOtaData = partitions.some(
    (partition) => partition.type === 0x01 && partition.subtype === 0x00
  );
  const otaAppSlots = partitions.filter(
    (partition) =>
      partition.type === 0x00 &&
      partition.subtype >= 0x10 &&
      partition.subtype <= 0x1f
  ).length;

  return hasOtaData && otaAppSlots >= 2;
}

function getOpenFlashBytes(board: Board, partitionedBytes: number): number {
  const totalFlashBytes = getTotalFlashBytes(board);
  if (totalFlashBytes <= 0) {
    return 0;
  }

  const reservedBytes = Math.min(
    totalFlashBytes,
    getPartitionTableOffset(board) + PARTITION_TABLE_REGION_SIZE
  );
  return Math.max(totalFlashBytes - reservedBytes - partitionedBytes, 0);
}

function getTotalFlashBytes(board: Board): number {
  if (board.flashSizeBytes !== null && board.flashSizeBytes > 0) {
    return board.flashSizeBytes;
  }

  return (board.partitions ?? []).reduce(
    (max, partition) => Math.max(max, partition.offset + partition.sizeBytes),
    0
  );
}

function getPartitionTableOffset(board: Board): number {
  return board.partitionTableOffset !== null && board.partitionTableOffset > 0
    ? board.partitionTableOffset
    : DEFAULT_PARTITION_TABLE_OFFSET;
}

function getFilesystemMetric(partition: BoardPartition): FilesystemMetric | null {
  const key = getFilesystemKey(partition);

  if (!key) {
    return null;
  }

  return {
    key,
    label:
      key === "fatfs" ? "FATFS" : key === "littlefs" ? "LittleFS" : "SPIFFS",
    bytes: 0,
    color: filesystemPalette[key]
  };
}

function getFilesystemKey(
  partition: BoardPartition
): keyof typeof filesystemPalette | null {
  if (partition.filesystem) {
    return partition.filesystem;
  }

  if (partition.type !== 0x01) {
    return null;
  }

  if (partition.subtype === 0x81) return "fatfs";
  if (partition.subtype === 0x82) return "spiffs";
  if (partition.subtype === 0x83) return "littlefs";

  return null;
}
