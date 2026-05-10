export const BOARD_STATUSES = [
  "available",
  "in_use",
  "needs_flashing",
  "broken",
  "archived",
  "unknown"
] as const;

export type BoardStatus = (typeof BOARD_STATUSES)[number];

export interface Board {
  id: string;
  name: string;
  description: string | null;
  status: BoardStatus;
  chipModel: string | null;
  macAddress: string | null;
  flashSizeBytes: number | null;
  psramSizeBytes: number | null;
  crystalFrequency: string | null;
  boardType: string | null;
  manufacturer: string | null;
  purchaseUrl: string | null;
  physicalLocation: string | null;
  projectId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lastConnectedAt: string | null;
}

export interface CreateBoardInput {
  name: string;
  description?: string | null;
  status?: BoardStatus;
  chipModel?: string | null;
  macAddress?: string | null;
  flashSizeBytes?: number | null;
  psramSizeBytes?: number | null;
  crystalFrequency?: string | null;
  boardType?: string | null;
  manufacturer?: string | null;
  purchaseUrl?: string | null;
  physicalLocation?: string | null;
  projectId?: string | null;
  notes?: string | null;
  lastConnectedAt?: string | null;
}

export type UpdateBoardInput = Partial<CreateBoardInput>;

export interface BoardListFilters {
  search?: string;
  status?: BoardStatus | "all";
  chipModel?: string;
}

export interface BoardDashboardStats {
  totalBoards: number;
  availableBoards: number;
  inUseBoards: number;
  brokenBoards: number;
  needsFlashingBoards: number;
  recentlyUpdatedBoards: Board[];
  recentlyConnectedBoards: Board[];
}

