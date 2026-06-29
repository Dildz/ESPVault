import type {
  CreateFirmwareHistoryInput,
  FirmwareHistoryEntry,
  UpdateFirmwareHistoryInput
} from "../../../shared/types/inventory";
import type {
  FirmwareHistoryListFilters,
  FirmwareHistoryRepository
} from "../../repositories/FirmwareHistoryRepository";
import { vaultDatabase, type VaultDatabase } from "./vaultDatabase";

export class DexieFirmwareHistoryRepository
  implements FirmwareHistoryRepository
{
  constructor(private readonly database: VaultDatabase = vaultDatabase) {}

  async list(
    filters: FirmwareHistoryListFilters = {}
  ): Promise<FirmwareHistoryEntry[]> {
    const entries = await this.database.firmwareHistory.toArray();

    return entries
      .map((entry) => this.normalizeEntry(entry))
      .filter((entry) => this.matchesFilters(entry, filters))
      .sort((left, right) => this.compareEntries(left, right));
  }

  async get(id: string): Promise<FirmwareHistoryEntry | null> {
    const entry = await this.database.firmwareHistory.get(id);
    return entry ? this.normalizeEntry(entry) : null;
  }

  async create(
    input: CreateFirmwareHistoryInput
  ): Promise<FirmwareHistoryEntry> {
    const now = new Date().toISOString();
    const entry: FirmwareHistoryEntry = {
      id: crypto.randomUUID(),
      boardId: this.requireBoardId(input.boardId),
      firmwareName: this.requireName(input.firmwareName),
      version: this.optionalText(input.version),
      source: this.optionalText(input.source),
      filePath: this.optionalText(input.filePath),
      notes: this.optionalText(input.notes),
      flashedAt: this.optionalText(input.flashedAt),
      createdAt: now
    };

    await this.database.firmwareHistory.add(entry);

    return entry;
  }

  async update(
    id: string,
    input: UpdateFirmwareHistoryInput
  ): Promise<FirmwareHistoryEntry> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error("Firmware entry not found.");
    }

    const entry: FirmwareHistoryEntry = {
      ...existing,
      firmwareName:
        input.firmwareName === undefined
          ? existing.firmwareName
          : this.requireName(input.firmwareName),
      version:
        input.version === undefined
          ? existing.version
          : this.optionalText(input.version),
      source:
        input.source === undefined
          ? existing.source
          : this.optionalText(input.source),
      filePath:
        input.filePath === undefined
          ? existing.filePath
          : this.optionalText(input.filePath),
      notes:
        input.notes === undefined
          ? existing.notes
          : this.optionalText(input.notes),
      flashedAt:
        input.flashedAt === undefined
          ? existing.flashedAt
          : this.optionalText(input.flashedAt)
    };

    await this.database.firmwareHistory.put(entry);

    return entry;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.get(id);
    if (!existing) {
      return false;
    }

    await this.database.firmwareHistory.delete(id);
    return true;
  }

  private matchesFilters(
    entry: FirmwareHistoryEntry,
    filters: FirmwareHistoryListFilters
  ): boolean {
    return !filters.boardId || entry.boardId === filters.boardId;
  }

  private compareEntries(
    left: FirmwareHistoryEntry,
    right: FirmwareHistoryEntry
  ): number {
    // Most recent first. ISO date strings sort chronologically, and a missing
    // flash date falls back to when the entry was logged.
    const leftKey = left.flashedAt ?? left.createdAt;
    const rightKey = right.flashedAt ?? right.createdAt;
    return (
      rightKey.localeCompare(leftKey) ||
      right.createdAt.localeCompare(left.createdAt)
    );
  }

  private normalizeEntry(entry: FirmwareHistoryEntry): FirmwareHistoryEntry {
    return {
      ...entry,
      firmwareName: this.requireName(entry.firmwareName),
      version: entry.version ?? null,
      source: entry.source ?? null,
      filePath: entry.filePath ?? null,
      notes: entry.notes ?? null,
      flashedAt: entry.flashedAt ?? null
    };
  }

  private requireBoardId(value: string): string {
    const boardId = value.trim();
    if (!boardId) {
      throw new Error("Board is required.");
    }

    return boardId;
  }

  private requireName(value: string): string {
    const name = value.trim();
    if (!name) {
      throw new Error("Firmware name is required.");
    }

    return name;
  }

  private optionalText(value: string | null | undefined): string | null {
    const text = value?.trim();
    return text ? text : null;
  }
}
