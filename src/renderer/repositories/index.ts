import { DexieBackupRepository } from "../storage/dexie/DexieBackupRepository";
import { DexieBoardRepository } from "../storage/dexie/DexieBoardRepository";
import { DexieProjectChecklistRepository } from "../storage/dexie/DexieProjectChecklistRepository";
import { DexieProjectRepository } from "../storage/dexie/DexieProjectRepository";
import type { BackupRepository } from "./BackupRepository";
import type { BoardRepository } from "./BoardRepository";
import type { ProjectChecklistRepository } from "./ProjectChecklistRepository";
import type { ProjectRepository } from "./ProjectRepository";

export interface LocalRepositories {
  backups: BackupRepository;
  boards: BoardRepository;
  projectChecklists: ProjectChecklistRepository;
  projects: ProjectRepository;
}

export const repositories: LocalRepositories = {
  backups: new DexieBackupRepository(),
  boards: new DexieBoardRepository(),
  projectChecklists: new DexieProjectChecklistRepository(),
  projects: new DexieProjectRepository()
};
