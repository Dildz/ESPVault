import {
  PROJECT_CHECKLIST_CATEGORIES,
  type CreateProjectChecklistItemInput,
  type ProjectChecklistCategory,
  type ProjectChecklistItem,
  type UpdateProjectChecklistItemInput
} from "../../../shared/types/inventory";
import type {
  ProjectChecklistListFilters,
  ProjectChecklistRepository
} from "../../repositories/ProjectChecklistRepository";
import { vaultDatabase, type VaultDatabase } from "./vaultDatabase";

export class DexieProjectChecklistRepository
  implements ProjectChecklistRepository
{
  constructor(private readonly database: VaultDatabase = vaultDatabase) {}

  async list(
    filters: ProjectChecklistListFilters = {}
  ): Promise<ProjectChecklistItem[]> {
    const items = await this.database.projectChecklistItems.toArray();

    return items
      .map((item) => this.normalizeChecklistItem(item))
      .filter((item) => this.matchesFilters(item, filters))
      .sort((left, right) => this.compareChecklistItems(left, right));
  }

  async get(id: string): Promise<ProjectChecklistItem | null> {
    const item = await this.database.projectChecklistItems.get(id);
    return item ? this.normalizeChecklistItem(item) : null;
  }

  async create(
    input: CreateProjectChecklistItemInput
  ): Promise<ProjectChecklistItem> {
    const now = new Date().toISOString();
    const projectId = this.requireProjectId(input.projectId);
    const completed = Boolean(input.completed);
    const item: ProjectChecklistItem = {
      id: crypto.randomUUID(),
      projectId,
      title: this.requireTitle(input.title),
      notes: this.optionalText(input.notes),
      category: this.optionalCategory(input.category),
      boardId: this.optionalText(input.boardId),
      completed,
      completedAt: completed ? now : null,
      sortOrder:
        this.optionalSortOrder(input.sortOrder) ??
        (await this.nextSortOrder(projectId)),
      createdAt: now,
      updatedAt: now
    };

    await this.database.projectChecklistItems.add(item);

    return item;
  }

  async update(
    id: string,
    input: UpdateProjectChecklistItemInput
  ): Promise<ProjectChecklistItem> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error("Checklist item not found.");
    }

    const now = new Date().toISOString();
    const completed =
      input.completed === undefined ? existing.completed : input.completed;
    const item: ProjectChecklistItem = {
      ...existing,
      title:
        input.title === undefined
          ? existing.title
          : this.requireTitle(input.title),
      notes:
        input.notes === undefined
          ? existing.notes
          : this.optionalText(input.notes),
      category:
        input.category === undefined
          ? existing.category
          : this.optionalCategory(input.category),
      boardId:
        input.boardId === undefined
          ? existing.boardId
          : this.optionalText(input.boardId),
      completed,
      completedAt:
        completed === existing.completed
          ? existing.completedAt
          : completed
            ? now
            : null,
      sortOrder:
        input.sortOrder === undefined
          ? existing.sortOrder
          : (this.optionalSortOrder(input.sortOrder) ?? existing.sortOrder),
      updatedAt: now
    };

    await this.database.projectChecklistItems.put(item);

    return item;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.get(id);
    if (!existing) {
      return false;
    }

    await this.database.projectChecklistItems.delete(id);
    return true;
  }

  private async nextSortOrder(projectId: string): Promise<number> {
    const projectItems = await this.database.projectChecklistItems
      .where("projectId")
      .equals(projectId)
      .toArray();
    const highestSortOrder = projectItems.reduce(
      (highest, item) => Math.max(highest, this.optionalSortOrder(item.sortOrder) ?? 0),
      0
    );

    return highestSortOrder + 1;
  }

  private matchesFilters(
    item: ProjectChecklistItem,
    filters: ProjectChecklistListFilters
  ): boolean {
    return !filters.projectId || item.projectId === filters.projectId;
  }

  private compareChecklistItems(
    left: ProjectChecklistItem,
    right: ProjectChecklistItem
  ): number {
    return (
      left.sortOrder - right.sortOrder ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.title.localeCompare(right.title)
    );
  }

  private normalizeChecklistItem(
    item: ProjectChecklistItem
  ): ProjectChecklistItem {
    return {
      ...item,
      title: this.requireTitle(item.title),
      notes: item.notes ?? null,
      category: this.optionalCategory(item.category),
      boardId: item.boardId ?? null,
      completed: Boolean(item.completed),
      completedAt: item.completedAt ?? null,
      sortOrder: this.optionalSortOrder(item.sortOrder) ?? 0
    };
  }

  private requireProjectId(value: string): string {
    const projectId = value.trim();
    if (!projectId) {
      throw new Error("Project is required.");
    }

    return projectId;
  }

  private requireTitle(value: string): string {
    const title = value.trim();
    if (!title) {
      throw new Error("Checklist title is required.");
    }

    return title;
  }

  private optionalText(value: string | null | undefined): string | null {
    const text = value?.trim();
    return text ? text : null;
  }

  private optionalCategory(
    value: ProjectChecklistCategory | null | undefined
  ): ProjectChecklistCategory | null {
    return value && PROJECT_CHECKLIST_CATEGORIES.includes(value) ? value : null;
  }

  private optionalSortOrder(value: number | null | undefined): number | null {
    return typeof value === "number" && Number.isFinite(value) && value >= 0
      ? Math.trunc(value)
      : null;
  }
}
