import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type {
  CreateFirmwareHistoryInput,
  FirmwareHistoryEntry,
  UpdateFirmwareHistoryInput
} from "../../shared/types/inventory";
import { repositories } from "../repositories";
import type { FirmwareHistoryListFilters } from "../repositories/FirmwareHistoryRepository";

const firmwareRepository = repositories.firmwareHistory;

export const useFirmwareHistoryStore = defineStore("firmwareHistory", () => {
  const entries = ref<FirmwareHistoryEntry[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const entryCount = computed(() => entries.value.length);

  async function loadItems(
    filters?: FirmwareHistoryListFilters
  ): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      entries.value = await firmwareRepository.list(filters);
    } catch (caughtError) {
      error.value = getErrorMessage(caughtError);
    } finally {
      loading.value = false;
    }
  }

  async function createItem(
    input: CreateFirmwareHistoryInput
  ): Promise<FirmwareHistoryEntry> {
    const entry = await firmwareRepository.create(input);
    await loadItems({ boardId: entry.boardId });
    return entry;
  }

  async function updateItem(
    id: string,
    input: UpdateFirmwareHistoryInput
  ): Promise<FirmwareHistoryEntry> {
    const entry = await firmwareRepository.update(id, input);
    await loadItems({ boardId: entry.boardId });
    return entry;
  }

  async function deleteItem(id: string): Promise<boolean> {
    const existing = entries.value.find((entry) => entry.id === id);
    const deleted = await firmwareRepository.delete(id);
    if (existing) {
      await loadItems({ boardId: existing.boardId });
    }
    return deleted;
  }

  function getEntriesForBoard(boardId: string): FirmwareHistoryEntry[] {
    return entries.value.filter((entry) => entry.boardId === boardId);
  }

  function getErrorMessage(caughtError: unknown): string {
    return caughtError instanceof Error
      ? caughtError.message
      : "The firmware history action could not be completed.";
  }

  return {
    entries,
    loading,
    error,
    entryCount,
    loadItems,
    createItem,
    updateItem,
    deleteItem,
    getEntriesForBoard
  };
});
