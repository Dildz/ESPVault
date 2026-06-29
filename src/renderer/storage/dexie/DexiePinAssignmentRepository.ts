import type {
  CreatePinAssignmentInput,
  PinAssignment,
  UpdatePinAssignmentInput
} from "../../../shared/types/inventory";
import type {
  PinAssignmentListFilters,
  PinAssignmentRepository
} from "../../repositories/PinAssignmentRepository";
import { vaultDatabase, type VaultDatabase } from "./vaultDatabase";

export class DexiePinAssignmentRepository
  implements PinAssignmentRepository
{
  constructor(private readonly database: VaultDatabase = vaultDatabase) {}

  async list(
    filters: PinAssignmentListFilters = {}
  ): Promise<PinAssignment[]> {
    const assignments = await this.database.pinAssignments.toArray();

    return assignments
      .map((assignment) => this.normalizeAssignment(assignment))
      .filter((assignment) => this.matchesFilters(assignment, filters))
      .sort((left, right) => this.compareAssignments(left, right));
  }

  async get(id: string): Promise<PinAssignment | null> {
    const assignment = await this.database.pinAssignments.get(id);
    return assignment ? this.normalizeAssignment(assignment) : null;
  }

  async create(input: CreatePinAssignmentInput): Promise<PinAssignment> {
    const now = new Date().toISOString();
    const boardId = this.requireBoardId(input.boardId);
    const gpio = this.requireGpio(input.gpio);

    // One assignment per (board, GPIO) — the overlay edits a single field per
    // pin, so a duplicate would be ambiguous. Callers update the existing one.
    if (await this.findByGpio(boardId, gpio)) {
      throw new Error(`GPIO ${gpio} already has an assignment on this board.`);
    }

    const assignment: PinAssignment = {
      id: crypto.randomUUID(),
      boardId,
      gpio,
      label: this.optionalText(input.label),
      function: this.optionalText(input.function),
      notes: this.optionalText(input.notes),
      createdAt: now,
      updatedAt: now
    };

    await this.database.pinAssignments.add(assignment);

    return assignment;
  }

  async update(
    id: string,
    input: UpdatePinAssignmentInput
  ): Promise<PinAssignment> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error("Pin assignment not found.");
    }

    const gpio =
      input.gpio === undefined ? existing.gpio : this.requireGpio(input.gpio);
    if (gpio !== existing.gpio) {
      const clash = await this.findByGpio(existing.boardId, gpio);
      if (clash && clash.id !== id) {
        throw new Error(`GPIO ${gpio} already has an assignment on this board.`);
      }
    }

    const assignment: PinAssignment = {
      ...existing,
      gpio,
      label:
        input.label === undefined
          ? existing.label
          : this.optionalText(input.label),
      function:
        input.function === undefined
          ? existing.function
          : this.optionalText(input.function),
      notes:
        input.notes === undefined
          ? existing.notes
          : this.optionalText(input.notes),
      updatedAt: new Date().toISOString()
    };

    await this.database.pinAssignments.put(assignment);

    return assignment;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.get(id);
    if (!existing) {
      return false;
    }

    await this.database.pinAssignments.delete(id);
    return true;
  }

  private async findByGpio(
    boardId: string,
    gpio: string
  ): Promise<PinAssignment | null> {
    const matches = await this.database.pinAssignments
      .where("boardId")
      .equals(boardId)
      .toArray();
    return matches.find((assignment) => assignment.gpio === gpio) ?? null;
  }

  private matchesFilters(
    assignment: PinAssignment,
    filters: PinAssignmentListFilters
  ): boolean {
    return !filters.boardId || assignment.boardId === filters.boardId;
  }

  private compareAssignments(
    left: PinAssignment,
    right: PinAssignment
  ): number {
    // Numeric GPIO order (GPIO2 before GPIO10); non-numeric falls back to text.
    const leftNumber = Number.parseInt(left.gpio, 10);
    const rightNumber = Number.parseInt(right.gpio, 10);
    const leftIsNumber = Number.isFinite(leftNumber);
    const rightIsNumber = Number.isFinite(rightNumber);

    if (leftIsNumber && rightIsNumber && leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }
    if (leftIsNumber !== rightIsNumber) {
      return leftIsNumber ? -1 : 1;
    }

    return left.gpio.localeCompare(right.gpio);
  }

  private normalizeAssignment(assignment: PinAssignment): PinAssignment {
    return {
      ...assignment,
      gpio: this.requireGpio(assignment.gpio),
      label: assignment.label ?? null,
      function: assignment.function ?? null,
      notes: assignment.notes ?? null
    };
  }

  private requireBoardId(value: string): string {
    const boardId = value.trim();
    if (!boardId) {
      throw new Error("Board is required.");
    }

    return boardId;
  }

  private requireGpio(value: string): string {
    const gpio = value.trim();
    if (!gpio) {
      throw new Error("GPIO is required.");
    }

    return gpio;
  }

  private optionalText(value: string | null | undefined): string | null {
    const text = value?.trim();
    return text ? text : null;
  }
}
