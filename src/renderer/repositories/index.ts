import { DexieAppSettingsRepository } from "../storage/dexie/DexieAppSettingsRepository";
import { DexieBackupRepository } from "../storage/dexie/DexieBackupRepository";
import { DexieBoardRepository } from "../storage/dexie/DexieBoardRepository";
import { DexieDatabaseHealthRepository } from "../storage/dexie/DexieDatabaseHealthRepository";
import { DexieFirmwareHistoryRepository } from "../storage/dexie/DexieFirmwareHistoryRepository";
import { DexieProjectChecklistRepository } from "../storage/dexie/DexieProjectChecklistRepository";
import { DexieProjectRepository } from "../storage/dexie/DexieProjectRepository";
import type { AppSettingsRepository } from "./AppSettingsRepository";
import type { BackupRepository } from "./BackupRepository";
import type { BoardRepository } from "./BoardRepository";
import type { DatabaseHealthRepository } from "./DatabaseHealthRepository";
import type { FirmwareHistoryRepository } from "./FirmwareHistoryRepository";
import type { ProjectChecklistRepository } from "./ProjectChecklistRepository";
import type { ProjectRepository } from "./ProjectRepository";

export interface LocalRepositories {
  appSettings: AppSettingsRepository;
  backups: BackupRepository;
  boards: BoardRepository;
  databaseHealth: DatabaseHealthRepository;
  firmwareHistory: FirmwareHistoryRepository;
  projectChecklists: ProjectChecklistRepository;
  projects: ProjectRepository;
}

export const repositories: LocalRepositories = {
  appSettings: new DexieAppSettingsRepository(),
  backups: new DexieBackupRepository(),
  boards: new DexieBoardRepository(),
  databaseHealth: new DexieDatabaseHealthRepository(),
  firmwareHistory: new DexieFirmwareHistoryRepository(),
  projectChecklists: new DexieProjectChecklistRepository(),
  projects: new DexieProjectRepository()
};
