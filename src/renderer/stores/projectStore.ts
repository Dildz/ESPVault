import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type {
  CreateProjectInput,
  Project,
  ProjectStatus,
  UpdateProjectInput
} from "../../shared/types/inventory";
import { repositories } from "../repositories";
import type { ProjectListFilters } from "../repositories/ProjectRepository";

const projectRepository = repositories.projects;

export const useProjectStore = defineStore("projects", () => {
  const projects = ref<Project[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const activeProjects = computed(() =>
    projects.value.filter((project) => project.status === "active")
  );

  async function loadProjects(filters?: ProjectListFilters): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      projects.value = await projectRepository.list(filters);
    } catch (caughtError) {
      error.value = getErrorMessage(caughtError);
    } finally {
      loading.value = false;
    }
  }

  async function createProject(input: CreateProjectInput): Promise<Project> {
    const project = await projectRepository.create(input);
    await loadProjects();
    return project;
  }

  async function updateProject(
    id: string,
    input: UpdateProjectInput
  ): Promise<Project> {
    const project = await projectRepository.update(id, input);
    await loadProjects();
    return project;
  }

  async function deleteProject(id: string): Promise<boolean> {
    const deleted = await projectRepository.delete(id);
    await loadProjects();
    return deleted;
  }

  function getProject(id: string | null | undefined): Project | null {
    if (!id) {
      return null;
    }

    return projects.value.find((project) => project.id === id) ?? null;
  }

  function getStatusLabel(status: ProjectStatus): string {
    return PROJECT_STATUS_LABELS[status];
  }

  function getErrorMessage(caughtError: unknown): string {
    return caughtError instanceof Error
      ? caughtError.message
      : "The project action could not be completed.";
  }

  return {
    projects,
    activeProjects,
    loading,
    error,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    getProject,
    getStatusLabel
  };
});

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  archived: "Archived"
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "success",
  on_hold: "warning",
  completed: "info",
  archived: "secondary"
};
