import type {
  CreateProjectInput,
  Project,
  ProjectStatus,
  UpdateProjectInput
} from "../../shared/types/inventory";

export interface ProjectListFilters {
  search?: string;
  status?: ProjectStatus | "all";
}

export interface ProjectRepository {
  list(filters?: ProjectListFilters): Promise<Project[]>;
  get(id: string): Promise<Project | null>;
  create(input: CreateProjectInput): Promise<Project>;
  update(id: string, input: UpdateProjectInput): Promise<Project>;
  delete(id: string): Promise<boolean>;
}
