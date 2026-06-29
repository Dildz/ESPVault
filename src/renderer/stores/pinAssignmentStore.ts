import { defineStore } from "pinia";
import { ref } from "vue";
import type {
  CreatePinAssignmentInput,
  PinAssignment,
  UpdatePinAssignmentInput
} from "../../shared/types/inventory";
import { repositories } from "../repositories";
import type { PinAssignmentListFilters } from "../repositories/PinAssignmentRepository";

const pinAssignmentRepository = repositories.pinAssignments;

export const usePinAssignmentStore = defineStore("pinAssignments", () => {
  const assignments = ref<PinAssignment[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadItems(
    filters?: PinAssignmentListFilters
  ): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      assignments.value = await pinAssignmentRepository.list(filters);
    } catch (caughtError) {
      error.value = getErrorMessage(caughtError);
    } finally {
      loading.value = false;
    }
  }

  async function createItem(
    input: CreatePinAssignmentInput
  ): Promise<PinAssignment> {
    const assignment = await pinAssignmentRepository.create(input);
    await loadItems({ boardId: assignment.boardId });
    return assignment;
  }

  async function updateItem(
    id: string,
    input: UpdatePinAssignmentInput
  ): Promise<PinAssignment> {
    const assignment = await pinAssignmentRepository.update(id, input);
    await loadItems({ boardId: assignment.boardId });
    return assignment;
  }

  async function deleteItem(id: string): Promise<boolean> {
    const existing = assignments.value.find(
      (assignment) => assignment.id === id
    );
    const deleted = await pinAssignmentRepository.delete(id);
    if (existing) {
      await loadItems({ boardId: existing.boardId });
    }
    return deleted;
  }

  function getAssignmentsForBoard(boardId: string): PinAssignment[] {
    return assignments.value.filter(
      (assignment) => assignment.boardId === boardId
    );
  }

  function getErrorMessage(caughtError: unknown): string {
    return caughtError instanceof Error
      ? caughtError.message
      : "The pin assignment action could not be completed.";
  }

  return {
    assignments,
    loading,
    error,
    loadItems,
    createItem,
    updateItem,
    deleteItem,
    getAssignmentsForBoard
  };
});
