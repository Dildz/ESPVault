import { DexieBackupRepository } from "../storage/dexie/DexieBackupRepository";
import { DexieBoardRepository } from "../storage/dexie/DexieBoardRepository";
import { DexieProjectRepository } from "../storage/dexie/DexieProjectRepository";
import type { BackupRepository } from "./BackupRepository";
import type { BoardRepository } from "./BoardRepository";
import type { ProjectRepository } from "./ProjectRepository";

export interface LocalRepositories {
  backups: BackupRepository;
  boards: BoardRepository;
  projects: ProjectRepository;
}

export const repositories: LocalRepositories = {
  backups: new DexieBackupRepository(),
  boards: new DexieBoardRepository(),
  projects: new DexieProjectRepository()
};
