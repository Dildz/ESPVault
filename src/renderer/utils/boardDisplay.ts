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

export function formatBytes(value: number | null): string {
  if (value === null) {
    return "Not set";
  }

  const megabytes = value / 1024 / 1024;
  if (Number.isInteger(megabytes)) {
    return `${megabytes} MB`;
  }

  return `${megabytes.toFixed(1)} MB`;
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

