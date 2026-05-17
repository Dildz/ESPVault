import type { Board } from "../../shared/types/board";
import type { BoardPartition } from "../../shared/types/partition";
import { formatBytes } from "./boardDisplay";

export interface PartitionMapSegment {
  key: string;
  label: string;
  width: string;
  color: string;
  backgroundImage: string | null;
  sizeText: string;
  offsetHex: string;
  endHex: string;
  typeLabel: string;
  subtypeLabel: string;
  isUnused: boolean;
  isReserved: boolean;
  showLabel: boolean;
  showMeta: boolean;
  tooltipLines: string[];
}

type RawPartitionSegment =
  | {
      kind: "partition";
      key: string;
      offset: number;
      sizeBytes: number;
      partition: BoardPartition;
    }
  | {
      kind: "reserved";
      key: string;
      label: string;
      offset: number;
      sizeBytes: number;
      color: string;
    }
  | {
      kind: "unused";
      key: string;
      offset: number;
      sizeBytes: number;
    };

const DEFAULT_PARTITION_TABLE_OFFSET = 0x8000;
const PARTITION_TABLE_REGION_SIZE = 0x1000;
const MIN_SEGMENT_PERCENT = 1;
const UNUSED_SEGMENT_COLOR = "#23524a";
const UNUSED_SEGMENT_PATTERN =
  "repeating-linear-gradient(135deg, rgba(45, 212, 191, 0.18) 0, rgba(45, 212, 191, 0.18) 8px, rgba(15, 23, 42, 0.14) 8px, rgba(15, 23, 42, 0.14) 16px)";

const PARTITION_TYPE_NAMES: Record<number, string> = {
  0x00: "Application",
  0x01: "Data"
};

const PARTITION_DATA_SUBTYPE_NAMES: Record<number, string> = {
  0x00: "OTA data",
  0x01: "PHY init",
  0x02: "NVS",
  0x03: "Core dump",
  0x04: "NVS keys",
  0x05: "eFuse emulation",
  0x06: "Undefined data",
  0x80: "ESPHTTPD data",
  0x81: "FATFS",
  0x82: "SPIFFS",
  0x83: "LittleFS",
  0x84: "Storage",
  0x85: "OTA backup",
  0x86: "NimBLE data",
  0x87: "Factory NVS"
};

const PARTITION_COLOR_OVERRIDES: Record<string, string | undefined> = {
  factory: "#f59e0b",
  ota_0: "#22c55e",
  ota_1: "#14b8a6",
  ota_2: "#06b6d4",
  ota: "#a78bfa",
  otadata: "#a78bfa",
  nvs: "#2dd4bf",
  fat: "#60a5fa",
  ffat: "#60a5fa",
  littlefs: "#38bdf8",
  spiffs: "#818cf8",
  coredump: "#fb7185",
  phy: "#a3e635",
  phy_init: "#a3e635",
  test: "#f472b6"
};

const PARTITION_TYPE_COLORS: Record<number, string | undefined> = {
  0x00: "#22c55e",
  0x01: "#38bdf8"
};

const PARTITION_PALETTE = [
  "#f97316",
  "#eab308",
  "#84cc16",
  "#2dd4bf",
  "#38bdf8",
  "#818cf8",
  "#c084fc",
  "#fb7185"
];

export function buildPartitionMapSegments(board: Board): PartitionMapSegment[] {
  const partitions = [...(board.partitions ?? [])].sort(
    (left, right) => left.offset - right.offset
  );

  if (!partitions.length) {
    return [];
  }

  const partitionTableOffset = getPartitionTableOffset(board);
  const rawSegments: RawPartitionSegment[] = [
    {
      kind: "reserved" as const,
      key: "bootloader",
      label: "Bootloader",
      offset: 0,
      sizeBytes: partitionTableOffset,
      color: "#64748b"
    },
    {
      kind: "reserved" as const,
      key: "partition-table",
      label: "Partition table",
      offset: partitionTableOffset,
      sizeBytes: PARTITION_TABLE_REGION_SIZE,
      color: "#475569"
    },
    ...partitions.map((partition) => ({
      kind: "partition" as const,
      key: `partition-${partition.offset}-${partition.type}-${partition.subtype}`,
      offset: partition.offset,
      sizeBytes: partition.sizeBytes,
      partition
    }))
  ].sort((left, right) => left.offset - right.offset);

  const totalFlashBytes = getTotalFlashBytes(board, rawSegments);
  const filledSegments = fillUnusedSegments(rawSegments, totalFlashBytes);
  const totalSpan = filledSegments.reduce(
    (sum, segment) => sum + segment.sizeBytes,
    0
  );

  if (totalSpan <= 0) {
    return [];
  }

  const adjustedPercents = filledSegments.map((segment) =>
    Math.max((segment.sizeBytes / totalSpan) * 100, MIN_SEGMENT_PERCENT)
  );
  const adjustedTotal = adjustedPercents.reduce((sum, width) => sum + width, 0);
  const normalizationFactor = 100 / adjustedTotal;
  let partitionIndex = 0;

  return filledSegments.map((segment, index) => {
    const widthPercent = adjustedPercents[index] * normalizationFactor;
    const width = `${widthPercent.toFixed(4)}%`;
    const offsetHex = formatHex(segment.offset, 4);
    const endHex = formatHex(segment.offset + segment.sizeBytes, 4);
    const sizeText = formatBytes(segment.sizeBytes);
    const showLabel = widthPercent >= 6;
    const showMeta = widthPercent >= 12;

    if (segment.kind === "unused") {
      return {
        key: segment.key,
        label: "Unused flash",
        width,
        color: UNUSED_SEGMENT_COLOR,
        backgroundImage: UNUSED_SEGMENT_PATTERN,
        sizeText,
        offsetHex,
        endHex,
        typeLabel: "Not applicable",
        subtypeLabel: "Not applicable",
        isUnused: true,
        isReserved: false,
        showLabel,
        showMeta: false,
        tooltipLines: [`Size: ${sizeText}`, `Start: ${offsetHex}`, `End: ${endHex}`]
      };
    }

    if (segment.kind === "reserved") {
      return {
        key: segment.key,
        label: segment.label,
        width,
        color: segment.color,
        backgroundImage: null,
        sizeText,
        offsetHex,
        endHex,
        typeLabel: "Reserved",
        subtypeLabel: "Reserved",
        isUnused: false,
        isReserved: true,
        showLabel,
        showMeta: widthPercent >= 10,
        tooltipLines: [`Size: ${sizeText}`, `Start: ${offsetHex}`, `End: ${endHex}`]
      };
    }

    const partition = segment.partition;
    const typeLabel = formatPartitionTypeLabel(partition.type);
    const subtypeLabel = formatPartitionSubtypeLabel(
      partition.type,
      partition.subtype
    );
    const color = getPartitionColor(partition, partitionIndex);
    partitionIndex += 1;

    return {
      key: segment.key,
      label: formatPartitionLabel(partition),
      width,
      color,
      backgroundImage: null,
      sizeText,
      offsetHex,
      endHex,
      typeLabel,
      subtypeLabel,
      isUnused: false,
      isReserved: false,
      showLabel,
      showMeta,
      tooltipLines: [
        `Size: ${sizeText}`,
        `Start: ${offsetHex}`,
        `End: ${endHex}`,
        `Type: ${typeLabel}`,
        `Subtype: ${subtypeLabel}`
      ]
    };
  });
}

export function formatPartitionLabel(partition: BoardPartition): string {
  return partition.label.trim() || `Partition ${partition.offsetHex}`;
}

export function formatPartitionTypeLabel(type: number): string {
  const hex = formatHex(type, 1);
  const name = PARTITION_TYPE_NAMES[type];
  return name ? `${name} (${hex})` : `Type ${hex}`;
}

export function formatPartitionSubtypeLabel(type: number, subtype: number): string {
  const hex = formatHex(subtype, 1);
  let name: string | undefined;

  if (type === 0x00) {
    if (subtype === 0x00) {
      name = "Factory app";
    } else if (subtype === 0x01) {
      name = "Test app";
    } else if (subtype >= 0x10 && subtype <= 0x1f) {
      name = `OTA ${subtype - 0x10}`;
    } else if (subtype === 0x20) {
      name = "Any app";
    } else if (subtype === 0x21) {
      name = "OTA app";
    }
  } else if (type === 0x01) {
    name = PARTITION_DATA_SUBTYPE_NAMES[subtype];
    if (!name && subtype >= 0x80 && subtype <= 0x9f) {
      name = "Custom data";
    }
  }

  return name ? `${name} (${hex})` : `Subtype ${hex}`;
}

export function formatPartitionFilesystem(partition: BoardPartition): string {
  if (partition.filesystem === "fatfs") {
    return "FATFS";
  }

  if (partition.filesystem === "littlefs") {
    return "LittleFS";
  }

  if (partition.filesystem === "spiffs") {
    return "SPIFFS";
  }

  return "N/A";
}

export function formatPartitionEndHex(partition: BoardPartition): string {
  return formatHex(partition.offset + partition.sizeBytes, 4);
}

export function formatPartitionFlags(partition: BoardPartition): string {
  return partition.flags === 0 ? "None" : partition.flagsHex;
}

export function formatPartitionSummary(board: Board): string {
  const count = board.partitions?.length ?? 0;
  if (!count) {
    return board.partitionTableReadError
      ? "Partition table read failed"
      : "No partition table recorded";
  }

  const countText = `${count} partition${count === 1 ? "" : "s"}`;
  return board.partitionTableOffsetHex
    ? `${countText} recorded from ${board.partitionTableOffsetHex}`
    : `${countText} recorded`;
}

export function getPartitionColor(partition: BoardPartition, index: number): string {
  const key = normalizePartitionColorKey(partition.label);
  return (
    (key ? PARTITION_COLOR_OVERRIDES[key] : undefined) ??
    PARTITION_TYPE_COLORS[partition.type] ??
    PARTITION_PALETTE[index % PARTITION_PALETTE.length]
  );
}

function fillUnusedSegments(
  segments: RawPartitionSegment[],
  totalFlashBytes: number
): RawPartitionSegment[] {
  const filledSegments: RawPartitionSegment[] = [];
  let cursor = 0;

  for (const segment of segments) {
    if (segment.sizeBytes <= 0) {
      continue;
    }

    if (segment.offset > cursor) {
      filledSegments.push({
        kind: "unused",
        key: `unused-${cursor}-${segment.offset}`,
        offset: cursor,
        sizeBytes: segment.offset - cursor
      });
    }

    if (segment.offset + segment.sizeBytes > cursor) {
      filledSegments.push(segment);
      cursor = segment.offset + segment.sizeBytes;
    }
  }

  if (totalFlashBytes > cursor) {
    filledSegments.push({
      kind: "unused",
      key: `unused-${cursor}-${totalFlashBytes}`,
      offset: cursor,
      sizeBytes: totalFlashBytes - cursor
    });
  }

  return filledSegments;
}

function getTotalFlashBytes(
  board: Board,
  segments: RawPartitionSegment[]
): number {
  const detectedFlash = board.flashSizeBytes;
  if (detectedFlash !== null && detectedFlash > 0) {
    return detectedFlash;
  }

  return segments.reduce(
    (max, segment) => Math.max(max, segment.offset + segment.sizeBytes),
    0
  );
}

function getPartitionTableOffset(board: Board): number {
  const offset = board.partitionTableOffset;
  return offset !== null && offset > 0 ? offset : DEFAULT_PARTITION_TABLE_OFFSET;
}

function normalizePartitionColorKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatHex(value: number, bytes: number): string {
  return `0x${value.toString(16).toUpperCase().padStart(bytes * 2, "0")}`;
}
