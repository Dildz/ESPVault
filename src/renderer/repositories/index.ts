import { DexieBoardRepository } from "../storage/dexie/DexieBoardRepository";
import type { BoardRepository } from "./BoardRepository";

export interface LocalRepositories {
  boards: BoardRepository;
}

export const repositories: LocalRepositories = {
  boards: new DexieBoardRepository()
};
