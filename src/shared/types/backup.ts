import type { Board } from "./board";
import type {
  AppSetting,
  BoardAttachment,
  BoardTag,
  FirmwareHistoryEntry,
  PinAssignment,
  Project
} from "./inventory";

export const BACKUP_FORMAT = "esp-board-vault-backup";
export const BACKUP_VERSION = 1;

export interface VaultBackupTables {
  boards: Board[];
  projects: Project[];
  boardTags: BoardTag[];
  firmwareHistory: FirmwareHistoryEntry[];
  attachments: BoardAttachment[];
  pinAssignments: PinAssignment[];
  appSettings: AppSetting[];
}

export type VaultBackupCounts = Record<keyof VaultBackupTables, number>;

export interface VaultBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  appVersion: string;
  exportedAt: string;
  databaseName: string;
  schemaVersion: number;
  data: VaultBackupTables;
}

export interface VaultBackupSummary {
  appVersion: string;
  exportedAt: string;
  schemaVersion: number;
  counts: VaultBackupCounts;
}

export function parseVaultBackup(value: unknown): VaultBackup {
  if (!isRecord(value)) {
    throw new Error("Backup file is not valid JSON data.");
  }

  if (value.format !== BACKUP_FORMAT) {
    throw new Error("Backup file is not an ESP Board Vault backup.");
  }

  if (value.version !== BACKUP_VERSION) {
    throw new Error("Backup version is not supported.");
  }

  if (
    typeof value.appVersion !== "string" ||
    typeof value.exportedAt !== "string" ||
    typeof value.databaseName !== "string" ||
    typeof value.schemaVersion !== "number" ||
    !isRecord(value.data)
  ) {
    throw new Error("Backup metadata is incomplete.");
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    appVersion: value.appVersion,
    exportedAt: value.exportedAt,
    databaseName: value.databaseName,
    schemaVersion: value.schemaVersion,
    data: {
      boards: readObjectArray<Board>(value.data, "boards", "id"),
      projects: readObjectArray<Project>(value.data, "projects", "id"),
      boardTags: readObjectArray<BoardTag>(value.data, "boardTags", "id"),
      firmwareHistory: readObjectArray<FirmwareHistoryEntry>(
        value.data,
        "firmwareHistory",
        "id"
      ),
      attachments: readObjectArray<BoardAttachment>(
        value.data,
        "attachments",
        "id"
      ),
      pinAssignments: readObjectArray<PinAssignment>(
        value.data,
        "pinAssignments",
        "id"
      ),
      appSettings: readObjectArray<AppSetting>(value.data, "appSettings", "key")
    }
  };
}

export function summarizeVaultBackup(backup: VaultBackup): VaultBackupSummary {
  return {
    appVersion: backup.appVersion,
    exportedAt: backup.exportedAt,
    schemaVersion: backup.schemaVersion,
    counts: {
      boards: backup.data.boards.length,
      projects: backup.data.projects.length,
      boardTags: backup.data.boardTags.length,
      firmwareHistory: backup.data.firmwareHistory.length,
      attachments: backup.data.attachments.length,
      pinAssignments: backup.data.pinAssignments.length,
      appSettings: backup.data.appSettings.length
    }
  };
}

function readObjectArray<TRecord>(
  container: Record<string, unknown>,
  key: string,
  primaryKey: string
): TRecord[] {
  const value = container[key];

  if (!Array.isArray(value)) {
    throw new Error(`Backup table "${key}" is missing.`);
  }

  if (
    value.some(
      (item) => !isRecord(item) || typeof item[primaryKey] !== "string"
    )
  ) {
    throw new Error(`Backup table "${key}" contains invalid records.`);
  }

  return value as TRecord[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
