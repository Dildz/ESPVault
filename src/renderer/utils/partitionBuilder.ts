import type { Board } from "../../shared/types/board";
import type { BoardPartition } from "../../shared/types/partition";

const PARTITION_BUILDER_URL =
  "https://thelastoutpostworkshop.github.io/ESP32PartitionBuilder/";
const PARTITION_CSV_HEADER = "# Name,Type,SubType,Offset,Size,Flags";

const DATA_SUBTYPE_SLUGS: Record<number, string> = {
  0x00: "ota",
  0x01: "phy_init",
  0x02: "nvs",
  0x03: "coredump",
  0x04: "nvs_keys",
  0x05: "efuse_emulation",
  0x06: "undefined",
  0x80: "esphttpd_data",
  0x81: "fat",
  0x82: "spiffs",
  0x83: "littlefs"
};

export function buildPartitionBuilderUrl(board: Board): string {
  const partitions = getBuilderPartitions(board);

  if (!partitions.length) {
    return PARTITION_BUILDER_URL;
  }

  const params = new URLSearchParams({
    flash: String(getFlashSizeMb(board, partitions))
  });
  params.set(
    "partitions",
    `base64:${encodeUtf8Base64(buildPartitionCsv(partitions))}`
  );

  return `${PARTITION_BUILDER_URL}?${params.toString()}`;
}

function buildPartitionCsv(partitions: BoardPartition[]): string {
  const lines = partitions.map((partition) => formatPartitionCsvLine(partition));
  return `${PARTITION_CSV_HEADER}\n${lines.join("\n")}`;
}

function formatPartitionCsvLine(partition: BoardPartition): string {
  const name = partition.label.trim() || "partition";
  const typeSlug = getPartitionTypeSlug(partition);
  const subtypeSlug = getPartitionSubtypeSlug(partition);
  const offset = partition.offsetHex || "0x0";
  const size = `0x${partition.sizeBytes.toString(16).toUpperCase()}`;

  return [escapeCsvValue(name), typeSlug, subtypeSlug, offset, size, ""].join(",");
}

function getBuilderPartitions(board: Board): BoardPartition[] {
  return [...(board.partitions ?? [])]
    .filter((partition) => partition.sizeBytes > 0 && !isReservedPartition(partition))
    .sort((left, right) => left.offset - right.offset);
}

function getPartitionTypeSlug(partition: BoardPartition): string {
  if (partition.type === 0x00) {
    return "app";
  }

  if (partition.type === 0x01) {
    return "data";
  }

  return `type${formatByteHex(partition.type)}`;
}

function getPartitionSubtypeSlug(partition: BoardPartition): string {
  if (partition.type === 0x00) {
    if (partition.subtype === 0x00) return "factory";
    if (partition.subtype === 0x01) return "test";
    if (partition.subtype >= 0x10 && partition.subtype <= 0x1f) {
      return `ota_${partition.subtype - 0x10}`;
    }
    if (partition.subtype === 0x20) return "any";
    if (partition.subtype === 0x21) return "ota_app";
  }

  if (partition.type === 0x01) {
    return (
      DATA_SUBTYPE_SLUGS[partition.subtype] ??
      `subtype${formatByteHex(partition.subtype)}`
    );
  }

  return `subtype${formatByteHex(partition.subtype)}`;
}

function getFlashSizeMb(board: Board, partitions: BoardPartition[]): number {
  if (board.flashSizeBytes !== null && board.flashSizeBytes > 0) {
    return Math.max(1, Math.round(board.flashSizeBytes / (1024 * 1024)));
  }

  const highestAddress = partitions.reduce(
    (max, partition) => Math.max(max, partition.offset + partition.sizeBytes),
    0
  );

  if (!highestAddress) {
    return 1;
  }

  return Math.max(1, Math.ceil(highestAddress / (1024 * 1024)));
}

function isReservedPartition(partition: BoardPartition): boolean {
  const label = partition.label.trim().toLowerCase();
  return label === "bootloader" || label === "partition table";
}

function escapeCsvValue(value: string): string {
  const escaped = value.replace(/"/g, "\"\"");
  return /[",\n]/.test(value) ? `"${escaped}"` : escaped;
}

function encodeUtf8Base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return globalThis.btoa(binary);
}

function formatByteHex(value: number): string {
  return value.toString(16).padStart(2, "0").toLowerCase();
}
