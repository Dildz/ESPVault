import type {
  Board,
  BoardDashboardStats,
  BoardListFilters,
  CreateBoardInput,
  UpdateBoardInput
} from "../../shared/types/board";

export interface BoardRepository {
  list(filters?: BoardListFilters): Promise<Board[]>;
  get(id: string): Promise<Board | null>;
  create(input: CreateBoardInput): Promise<Board>;
  update(id: string, input: UpdateBoardInput): Promise<Board>;
  delete(id: string): Promise<boolean>;
  dashboardStats(): Promise<BoardDashboardStats>;
}

