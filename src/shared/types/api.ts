import type {
  Board,
  BoardDashboardStats,
  BoardListFilters,
  CreateBoardInput,
  UpdateBoardInput
} from "./board";
import type { MockDetectedBoard } from "./serial";

export interface EspBoardVaultApi {
  boards: {
    list(filters?: BoardListFilters): Promise<Board[]>;
    get(id: string): Promise<Board | null>;
    create(input: CreateBoardInput): Promise<Board>;
    update(id: string, input: UpdateBoardInput): Promise<Board>;
    delete(id: string): Promise<boolean>;
    dashboardStats(): Promise<BoardDashboardStats>;
  };
  serialDetection: {
    scanMock(): Promise<MockDetectedBoard>;
  };
}

