import type {
  VaultBackup,
  VaultBackupSummary
} from "../../shared/types/backup";

export interface BackupRepository {
  exportBackup(): Promise<VaultBackup>;
  importBackup(backup: VaultBackup): Promise<VaultBackupSummary>;
}
