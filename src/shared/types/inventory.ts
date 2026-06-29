export const PROJECT_STATUSES = [
  "active",
  "needs_repair",
  "on_hold",
  "completed",
  "archived"
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface Project {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  status: ProjectStatus;
  codeFolderPath: string | null;
  repoUrl: string | null;
  ide: string | null;
  coverImagePath: string | null;
  coverImageFilename: string | null;
  coverImageMimeType: string | null;
  coverImageSizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string | null;
  location?: string | null;
  status?: ProjectStatus;
  codeFolderPath?: string | null;
  repoUrl?: string | null;
  ide?: string | null;
  coverImagePath?: string | null;
  coverImageFilename?: string | null;
  coverImageMimeType?: string | null;
  coverImageSizeBytes?: number | null;
}

export type UpdateProjectInput = Partial<CreateProjectInput>;

export const PROJECT_CHECKLIST_CATEGORIES = [
  "hardware",
  "firmware",
  "testing",
  "enclosure",
  "documentation",
  "install"
] as const;

export type ProjectChecklistCategory =
  (typeof PROJECT_CHECKLIST_CATEGORIES)[number];

export interface ProjectChecklistItem {
  id: string;
  projectId: string;
  title: string;
  notes: string | null;
  category: ProjectChecklistCategory | null;
  boardId: string | null;
  completed: boolean;
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectChecklistItemInput {
  projectId: string;
  title: string;
  notes?: string | null;
  category?: ProjectChecklistCategory | null;
  boardId?: string | null;
  completed?: boolean;
  sortOrder?: number | null;
}

export type UpdateProjectChecklistItemInput =
  Partial<Omit<CreateProjectChecklistItemInput, "projectId">>;

export interface BoardTag {
  id: string;
  boardId: string;
  tag: string;
  createdAt: string;
}

export interface CreateBoardTagInput {
  boardId: string;
  tag: string;
}

export interface FirmwareHistoryEntry {
  id: string;
  boardId: string;
  firmwareName: string;
  version: string | null;
  source: string | null;
  filePath: string | null;
  notes: string | null;
  flashedAt: string | null;
  createdAt: string;
}

export interface CreateFirmwareHistoryInput {
  boardId: string;
  firmwareName: string;
  version?: string | null;
  source?: string | null;
  filePath?: string | null;
  notes?: string | null;
  flashedAt?: string | null;
}

export type UpdateFirmwareHistoryInput =
  Partial<Omit<CreateFirmwareHistoryInput, "boardId">>;

export type AttachmentType = "photo" | "firmware" | "backup" | "document" | "other";

export interface BoardAttachment {
  id: string;
  boardId: string;
  type: AttachmentType;
  filename: string;
  localPath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

export interface PinAssignment {
  id: string;
  boardId: string;
  gpio: string;
  label: string | null;
  function: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePinAssignmentInput {
  boardId: string;
  gpio: string;
  label?: string | null;
  function?: string | null;
  notes?: string | null;
}

export type UpdatePinAssignmentInput =
  Partial<Omit<CreatePinAssignmentInput, "boardId">>;

export interface AppSetting {
  key: string;
  value: unknown;
  updatedAt: string;
}
