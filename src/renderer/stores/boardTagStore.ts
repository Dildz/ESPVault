import { defineStore } from "pinia";
import { ref } from "vue";
import type {
  BoardTag,
  CreateBoardTagInput
} from "../../shared/types/inventory";
import { repositories } from "../repositories";
import type { BoardTagListFilters } from "../repositories/BoardTagRepository";

const boardTagRepository = repositories.boardTags;

export const useBoardTagStore = defineStore("boardTags", () => {
  const tags = ref<BoardTag[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadItems(filters?: BoardTagListFilters): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      tags.value = await boardTagRepository.list(filters);
    } catch (caughtError) {
      error.value = getErrorMessage(caughtError);
    } finally {
      loading.value = false;
    }
  }

  async function createItem(input: CreateBoardTagInput): Promise<BoardTag> {
    const tag = await boardTagRepository.create(input);
    await loadItems({ boardId: tag.boardId });
    return tag;
  }

  async function deleteItem(id: string): Promise<boolean> {
    const existing = tags.value.find((tag) => tag.id === id);
    const deleted = await boardTagRepository.delete(id);
    if (existing) {
      await loadItems({ boardId: existing.boardId });
    }
    return deleted;
  }

  function getTagsForBoard(boardId: string): BoardTag[] {
    return tags.value.filter((tag) => tag.boardId === boardId);
  }

  function getErrorMessage(caughtError: unknown): string {
    return caughtError instanceof Error
      ? caughtError.message
      : "The tag action could not be completed.";
  }

  return {
    tags,
    loading,
    error,
    loadItems,
    createItem,
    deleteItem,
    getTagsForBoard
  };
});
