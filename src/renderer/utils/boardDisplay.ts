import type { BoardStatus } from "../../shared/types/board";

export const BOARD_STATUS_LABELS: Record<BoardStatus, string> = {
  available: "Available",
  in_use: "In use",
  needs_flashing: "Needs flashing",
  broken: "Broken",
  archived: "Archived",
  unknown: "Unknown"
};

export const BOARD_STATUS_COLORS: Record<BoardStatus, string> = {
  available: "success",
  in_use: "info",
  needs_flashing: "warning",
  broken: "error",
  archived: "secondary",
  unknown: "secondary"
};

export const BOARD_STATUS_ICONS: Record<BoardStatus, string> = {
  available: "mdi-check-circle-outline",
  in_use: "mdi-play-circle-outline",
  needs_flashing: "mdi-flash-alert-outline",
  broken: "mdi-alert-octagon-outline",
  archived: "mdi-archive-outline",
  unknown: "mdi-help-circle-outline"
};

export function formatBytes(value: number | null): string {
  if (value === null) {
    return "Not set";
  }

  if (value < 1024 * 1024) {
    const kilobytes = value / 1024;
    return Number.isInteger(kilobytes)
      ? `${kilobytes} KB`
      : `${kilobytes.toFixed(1)} KB`;
  }

  const megabytes = value / 1024 / 1024;
  if (Number.isInteger(megabytes)) {
    return `${megabytes} MB`;
  }

  return `${megabytes.toFixed(1)} MB`;
}

export function formatFlashSize(
  bytes: number | null,
  label: string | null
): string {
  return bytes === null ? label ?? "Not set" : formatBytes(bytes);
}

export function formatPsramSize(
  bytes: number | null,
  detected: boolean | null,
  unknownLabel = "Not set"
): string {
  if (bytes !== null) {
    return formatBytes(bytes);
  }

  if (detected === null) {
    return unknownLabel;
  }

  return detected ? "Detected" : "Not detected";
}

export function formatDate(value: string | null): string {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
