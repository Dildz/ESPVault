import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type {
  Board,
  BoardDashboardStats,
  CreateBoardInput,
  UpdateBoardInput
} from "../../shared/types/board";

export const useBoardStore = defineStore("boards", () => {
  const boards = ref<Board[]>([]);
  const dashboardStats = ref<BoardDashboardStats | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const chipModels = computed(() => {
    const models = boards.value
      .map((board) => board.chipModel)
      .filter((model): model is string => Boolean(model));

    return Array.from(new Set(models)).sort((left, right) =>
      left.localeCompare(right)
    );
  });

  async function loadBoards(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      boards.value = await window.api.boards.list();
    } catch (caughtError) {
      error.value = getErrorMessage(caughtError);
    } finally {
      loading.value = false;
    }
  }

  async function loadDashboardStats(): Promise<void> {
    error.value = null;

    try {
      dashboardStats.value = await window.api.boards.dashboardStats();
    } catch (caughtError) {
      error.value = getErrorMessage(caughtError);
    }
  }

  async function createBoard(input: CreateBoardInput): Promise<Board> {
    const board = await window.api.boards.create(input);
    await refresh();
    return board;
  }

  async function updateBoard(id: string, input: UpdateBoardInput): Promise<Board> {
    const board = await window.api.boards.update(id, input);
    await refresh();
    return board;
  }

  async function deleteBoard(id: string): Promise<boolean> {
    const deleted = await window.api.boards.delete(id);
    await refresh();
    return deleted;
  }

  async function refresh(): Promise<void> {
    await Promise.all([loadBoards(), loadDashboardStats()]);
  }

  function getErrorMessage(caughtError: unknown): string {
    return caughtError instanceof Error
      ? caughtError.message
      : "The board action could not be completed.";
  }

  return {
    boards,
    dashboardStats,
    loading,
    error,
    chipModels,
    loadBoards,
    loadDashboardStats,
    refresh,
    createBoard,
    updateBoard,
    deleteBoard
  };
});

