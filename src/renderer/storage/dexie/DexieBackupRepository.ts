import packageMetadata from "../../../../package.json";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  summarizeVaultBackup,
  type VaultBackup,
  type VaultBackupSummary
} from "../../../shared/types/backup";
import type { BackupRepository } from "../../repositories/BackupRepository";
import { vaultDatabase, type VaultDatabase } from "./vaultDatabase";

export class DexieBackupRepository implements BackupRepository {
  constructor(private readonly database: VaultDatabase = vaultDatabase) {}

  async exportBackup(): Promise<VaultBackup> {
    const [
      boards,
      projects,
      boardTags,
      firmwareHistory,
      attachments,
      pinAssignments,
      appSettings
    ] = await Promise.all([
      this.database.boards.toArray(),
      this.database.projects.toArray(),
      this.database.boardTags.toArray(),
      this.database.firmwareHistory.toArray(),
      this.database.attachments.toArray(),
      this.database.pinAssignments.toArray(),
      this.database.appSettings.toArray()
    ]);

    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      appVersion: packageMetadata.version,
      exportedAt: new Date().toISOString(),
      databaseName: this.database.name,
      schemaVersion: this.database.verno,
      data: {
        boards,
        projects,
        boardTags,
        firmwareHistory,
        attachments,
        pinAssignments,
        appSettings
      }
    };
  }

  async importBackup(backup: VaultBackup): Promise<VaultBackupSummary> {
    await this.database.transaction(
      "rw",
      [
        this.database.boards,
        this.database.projects,
        this.database.boardTags,
        this.database.firmwareHistory,
        this.database.attachments,
        this.database.pinAssignments,
        this.database.appSettings
      ],
      async () => {
        await Promise.all([
          this.database.boards.clear(),
          this.database.projects.clear(),
          this.database.boardTags.clear(),
          this.database.firmwareHistory.clear(),
          this.database.attachments.clear(),
          this.database.pinAssignments.clear(),
          this.database.appSettings.clear()
        ]);

        await Promise.all([
          this.database.boards.bulkPut(backup.data.boards),
          this.database.projects.bulkPut(backup.data.projects),
          this.database.boardTags.bulkPut(backup.data.boardTags),
          this.database.firmwareHistory.bulkPut(backup.data.firmwareHistory),
          this.database.attachments.bulkPut(backup.data.attachments),
          this.database.pinAssignments.bulkPut(backup.data.pinAssignments),
          this.database.appSettings.bulkPut(backup.data.appSettings)
        ]);
      }
    );

    return summarizeVaultBackup(backup);
  }
}
