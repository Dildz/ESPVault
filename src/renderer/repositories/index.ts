import { DexieBackupRepository } from "../storage/dexie/DexieBackupRepository";
import { DexieBoardRepository } from "../storage/dexie/DexieBoardRepository";
import type { BackupRepository } from "./BackupRepository";
import type { BoardRepository } from "./BoardRepository";

export interface LocalRepositories {
  backups: BackupRepository;
  boards: BoardRepository;
}

export const repositories: LocalRepositories = {
  backups: new DexieBackupRepository(),
  boards: new DexieBoardRepository()
};
