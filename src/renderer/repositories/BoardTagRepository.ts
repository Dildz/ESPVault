import type {
  BoardTag,
  CreateBoardTagInput
} from "../../shared/types/inventory";

export interface BoardTagListFilters {
  boardId?: string;
}

export interface BoardTagRepository {
  list(filters?: BoardTagListFilters): Promise<BoardTag[]>;
  create(input: CreateBoardTagInput): Promise<BoardTag>;
  delete(id: string): Promise<boolean>;
}
