import type {
  CreatePinAssignmentInput,
  PinAssignment,
  UpdatePinAssignmentInput
} from "../../shared/types/inventory";

export interface PinAssignmentListFilters {
  boardId?: string;
}

export interface PinAssignmentRepository {
  list(filters?: PinAssignmentListFilters): Promise<PinAssignment[]>;
  get(id: string): Promise<PinAssignment | null>;
  create(input: CreatePinAssignmentInput): Promise<PinAssignment>;
  update(
    id: string,
    input: UpdatePinAssignmentInput
  ): Promise<PinAssignment>;
  delete(id: string): Promise<boolean>;
}
