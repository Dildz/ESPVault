import type {
  BoardTag,
  CreateBoardTagInput
} from "../../../shared/types/inventory";
import type {
  BoardTagListFilters,
  BoardTagRepository
} from "../../repositories/BoardTagRepository";
import { vaultDatabase, type VaultDatabase } from "./vaultDatabase";

export class DexieBoardTagRepository implements BoardTagRepository {
  constructor(private readonly database: VaultDatabase = vaultDatabase) {}

  async list(filters: BoardTagListFilters = {}): Promise<BoardTag[]> {
    const tags = await this.database.boardTags.toArray();

    return tags
      .filter((tag) => !filters.boardId || tag.boardId === filters.boardId)
      .sort((left, right) =>
        left.tag.localeCompare(right.tag, undefined, { sensitivity: "base" })
      );
  }

  async create(input: CreateBoardTagInput): Promise<BoardTag> {
    const boardId = this.requireBoardId(input.boardId);
    const tagText = this.requireTag(input.tag);

    // A board can't carry the same tag twice (case-insensitive); re-adding an
    // existing one is a no-op that returns the existing record.
    const existing = await this.database.boardTags
      .where("boardId")
      .equals(boardId)
      .toArray();
    const duplicate = existing.find(
      (tag) => tag.tag.toLowerCase() === tagText.toLowerCase()
    );
    if (duplicate) {
      return duplicate;
    }

    const tag: BoardTag = {
      id: crypto.randomUUID(),
      boardId,
      tag: tagText,
      createdAt: new Date().toISOString()
    };

    await this.database.boardTags.add(tag);

    return tag;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.database.boardTags.get(id);
    if (!existing) {
      return false;
    }

    await this.database.boardTags.delete(id);
    return true;
  }

  private requireBoardId(value: string): string {
    const boardId = value.trim();
    if (!boardId) {
      throw new Error("Board is required.");
    }

    return boardId;
  }

  private requireTag(value: string): string {
    const tag = value.trim();
    if (!tag) {
      throw new Error("Tag is required.");
    }

    return tag;
  }
}
