import { repositories } from "../repositories";

export const BACKUP_STALE_AFTER_DAYS = 14;

const LAST_BACKUP_SETTING_KEY = "lastBackupAt";
const LAST_BACKUP_APP_VERSION_SETTING_KEY = "lastBackupAppVersion";
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type BackupReminderStatus =
  | "current"
  | "never"
  | "stale"
  | "version_mismatch";

export interface BackupReminder {
  message: string | null;
  status: BackupReminderStatus;
  shouldWarn: boolean;
}

export interface BackupStatus {
  lastBackupAppVersion: string | null;
  lastBackupAt: string | null;
}

export interface BackupReminderOptions {
  currentAppVersion?: string | null;
  lastBackupAppVersion?: string | null;
}

export async function getBackupStatus(): Promise<BackupStatus> {
  const [lastBackupAtSetting, lastBackupAppVersionSetting] = await Promise.all([
    repositories.appSettings.get(LAST_BACKUP_SETTING_KEY),
    repositories.appSettings.get(LAST_BACKUP_APP_VERSION_SETTING_KEY)
  ]);

  return {
    lastBackupAppVersion: normalizeAppVersion(lastBackupAppVersionSetting?.value),
    lastBackupAt: normalizeBackupTimestamp(lastBackupAtSetting?.value)
  };
}

export async function getLastBackupAt(): Promise<string | null> {
  const status = await getBackupStatus();
  return status.lastBackupAt;
}

export async function recordBackupExportedAt(
  exportedAt: string,
  appVersion?: string | null
): Promise<BackupStatus> {
  const normalizedTimestamp =
    normalizeBackupTimestamp(exportedAt) ?? new Date().toISOString();
  const normalizedAppVersion = normalizeAppVersion(appVersion);

  await repositories.appSettings.set(LAST_BACKUP_SETTING_KEY, normalizedTimestamp);

  if (normalizedAppVersion) {
    await repositories.appSettings.set(
      LAST_BACKUP_APP_VERSION_SETTING_KEY,
      normalizedAppVersion
    );
  } else {
    await repositories.appSettings.delete(LAST_BACKUP_APP_VERSION_SETTING_KEY);
  }

  return {
    lastBackupAppVersion: normalizedAppVersion,
    lastBackupAt: normalizedTimestamp
  };
}

export function getBackupReminder(
  lastBackupAt: string | null,
  now = new Date(),
  options: BackupReminderOptions = {}
): BackupReminder {
  if (!lastBackupAt) {
    return {
      message:
        "No backup is recorded for this vault. Export a backup first if you want a recovery copy.",
      shouldWarn: true,
      status: "never"
    };
  }

  const currentAppVersion = normalizeAppVersion(options.currentAppVersion);
  const lastBackupAppVersion = normalizeAppVersion(options.lastBackupAppVersion);

  if (currentAppVersion && !lastBackupAppVersion) {
    return {
      message:
        "Your last backup does not include app version information. Export a new backup to capture the current vault format.",
      shouldWarn: true,
      status: "version_mismatch"
    };
  }

  if (
    currentAppVersion &&
    lastBackupAppVersion &&
    currentAppVersion !== lastBackupAppVersion
  ) {
    return {
      message:
        "Your last backup was created with a different app version. Export a new backup to capture the current vault format.",
      shouldWarn: true,
      status: "version_mismatch"
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

function normalizeAppVersion(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
