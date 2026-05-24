import { repositories } from "../repositories";

export const BACKUP_STALE_AFTER_DAYS = 14;

const LAST_BACKUP_SETTING_KEY = "lastBackupAt";
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type BackupReminderStatus = "current" | "never" | "stale";

export interface BackupReminder {
  message: string | null;
  status: BackupReminderStatus;
  shouldWarn: boolean;
}

export async function getLastBackupAt(): Promise<string | null> {
  const setting = await repositories.appSettings.get(LAST_BACKUP_SETTING_KEY);
  return normalizeBackupTimestamp(setting?.value);
}

export async function recordBackupExportedAt(exportedAt: string): Promise<string> {
  const normalizedTimestamp =
    normalizeBackupTimestamp(exportedAt) ?? new Date().toISOString();

  await repositories.appSettings.set(
    LAST_BACKUP_SETTING_KEY,
    normalizedTimestamp
  );
  return normalizedTimestamp;
}

export function getBackupReminder(
  lastBackupAt: string | null,
  now = new Date()
): BackupReminder {
  if (!lastBackupAt) {
    return {
      message:
        "No backup is recorded for this vault. Export a backup first if you want a recovery copy.",
      shouldWarn: true,
      status: "never"
    };
  }

  const lastBackupDate = new Date(lastBackupAt);
  const backupAgeDays =
    (now.getTime() - lastBackupDate.getTime()) / MILLISECONDS_PER_DAY;

  if (Number.isNaN(backupAgeDays) || backupAgeDays > BACKUP_STALE_AFTER_DAYS) {
    return {
      message: `Your last recorded backup was more than ${BACKUP_STALE_AFTER_DAYS} days ago. Export a backup first if you want a current recovery copy.`,
      shouldWarn: true,
      status: "stale"
    };
  }

  return {
    message: null,
    shouldWarn: false,
    status: "current"
  };
}

function normalizeBackupTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}
