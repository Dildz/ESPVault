import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type {
  CreateProjectChecklistItemInput,
  ProjectChecklistItem,
  UpdateProjectChecklistItemInput
} from "../../shared/types/inventory";
import { repositories } from "../repositories";
import type { ProjectChecklistListFilters } from "../repositories/ProjectChecklistRepository";

const checklistRepository = repositories.projectChecklists;

export const useProjectChecklistStore = defineStore("projectChecklists", () => {
  const items = ref<ProjectChecklistItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const openItemCount = computed(
    () => items.value.filter((item) => !item.completed).length
  );

  async function loadItems(
    filters?: ProjectChecklistListFilters
  ): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      items.value = await checklistRepository.list(filters);
    } catch (caughtError) {
      error.value = getErrorMessage(caughtError);
    } finally {
      loading.value = false;
    }
  }

  async function createItem(
    input: CreateProjectChecklistItemInput
  ): Promise<ProjectChecklistItem> {
    const item = await checklistRepository.create(input);
    await loadItems();
    return item;
  }

  async function updateItem(
    id: string,
    input: UpdateProjectChecklistItemInput
  ): Promise<ProjectChecklistItem> {
    const item = await checklistRepository.update(id, input);
    await loadItems();
    return item;
  }

  async function deleteItem(id: string): Promise<boolean> {
    const deleted = await checklistRepository.delete(id);
    await loadItems();
    return deleted;
  }

  async function moveItem(
    projectId: string,
    id: string,
    direction: "up" | "down"
  ): Promise<void> {
    const projectItems = getItemsForProject(projectId);
    const currentIndex = projectItems.findIndex((item) => item.id === id);
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= projectItems.length
    ) {
      return;
    }

    const currentItem = projectItems[currentIndex];
    const nextItem = projectItems[nextIndex];

    await Promise.all([
      checklistRepository.update(currentItem.id, {
        sortOrder: nextItem.sortOrder
      }),
      checklistRepository.update(nextItem.id, {
        sortOrder: currentItem.sortOrder
      })
    ]);
    await loadItems();
  }

  function getItemsForProject(projectId: string): ProjectChecklistItem[] {
    return items.value
      .filter((item) => item.projectId === projectId)
      .sort(compareChecklistItems);
  }

  function getErrorMessage(caughtError: unknown): string {
    return caughtError instanceof Error
      ? caughtError.message
      : "The checklist action could not be completed.";
  }

  return {
    items,
    loading,
    error,
    openItemCount,
    loadItems,
    createItem,
    updateItem,
    deleteItem,
    moveItem,
    getItemsForProject
  };
});

function compareChecklistItems(
  left: ProjectChecklistItem,
  right: ProjectChecklistItem
): number {
  return (
    left.sortOrder - right.sortOrder ||
    left.createdAt.localeCompare(right.createdAt) ||
    left.title.localeCompare(right.title)
  );
}
