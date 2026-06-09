import { repositories } from "../repositories";

export const SCAN_FRESHNESS_THRESHOLD_DAYS_SETTING_KEY =
  "scanFreshnessThresholdDays";
export const DEFAULT_SCAN_FRESHNESS_THRESHOLD_DAYS = 180;
export const MIN_SCAN_FRESHNESS_THRESHOLD_DAYS = 1;
export const MAX_SCAN_FRESHNESS_THRESHOLD_DAYS = 3650;

const DAY_MS = 24 * 60 * 60 * 1000;

export async function loadScanFreshnessThresholdDays(): Promise<number> {
  const setting = await repositories.appSettings.get(
    SCAN_FRESHNESS_THRESHOLD_DAYS_SETTING_KEY
  );

  return normalizeScanFreshnessThresholdDays(setting?.value);
}

export async function saveScanFreshnessThresholdDays(
  value: unknown
): Promise<number> {
  const days = parseScanFreshnessThresholdDays(value);

  if (days === null) {
    throw new Error(
      `Enter a whole number from ${MIN_SCAN_FRESHNESS_THRESHOLD_DAYS} to ${MAX_SCAN_FRESHNESS_THRESHOLD_DAYS} days.`
    );
  }

  await repositories.appSettings.set(
    SCAN_FRESHNESS_THRESHOLD_DAYS_SETTING_KEY,
    days
  );

  return days;
}

export function normalizeScanFreshnessThresholdDays(value: unknown): number {
  return (
    parseScanFreshnessThresholdDays(value) ??
    DEFAULT_SCAN_FRESHNESS_THRESHOLD_DAYS
  );
}

export function parseScanFreshnessThresholdDays(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  if (
    !Number.isFinite(parsed) ||
    !Number.isInteger(parsed) ||
    parsed < MIN_SCAN_FRESHNESS_THRESHOLD_DAYS ||
    parsed > MAX_SCAN_FRESHNESS_THRESHOLD_DAYS
  ) {
    return null;
  }

  return parsed;
}

export function getScanFreshnessCutoffMs(
  referenceMs: number,
  thresholdDays: number
): number {
  return referenceMs - thresholdDays * DAY_MS;
}

export function formatScanFreshnessThresholdDetail(days: number): string {
  return `Last ${days} ${days === 1 ? "day" : "days"}`;
}
