import type {
  CreateFirmwareHistoryInput,
  FirmwareHistoryEntry,
  UpdateFirmwareHistoryInput
} from "../../shared/types/inventory";

export interface FirmwareHistoryListFilters {
  boardId?: string;
}

export interface FirmwareHistoryRepository {
  list(filters?: FirmwareHistoryListFilters): Promise<FirmwareHistoryEntry[]>;
  get(id: string): Promise<FirmwareHistoryEntry | null>;
  create(input: CreateFirmwareHistoryInput): Promise<FirmwareHistoryEntry>;
  update(
    id: string,
    input: UpdateFirmwareHistoryInput
  ): Promise<FirmwareHistoryEntry>;
  delete(id: string): Promise<boolean>;
}
