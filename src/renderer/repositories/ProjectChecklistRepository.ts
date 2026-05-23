import type {
  CreateProjectChecklistItemInput,
  ProjectChecklistItem,
  UpdateProjectChecklistItemInput
} from "../../shared/types/inventory";

export interface ProjectChecklistListFilters {
  projectId?: string;
}

export interface ProjectChecklistRepository {
  list(filters?: ProjectChecklistListFilters): Promise<ProjectChecklistItem[]>;
  get(id: string): Promise<ProjectChecklistItem | null>;
  create(input: CreateProjectChecklistItemInput): Promise<ProjectChecklistItem>;
  update(
    id: string,
    input: UpdateProjectChecklistItemInput
  ): Promise<ProjectChecklistItem>;
  delete(id: string): Promise<boolean>;
}
