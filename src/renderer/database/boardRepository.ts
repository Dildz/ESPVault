import {
  BOARD_STATUSES,
  type Board,
  type BoardDashboardStats,
  type BoardListFilters,
  type BoardStatus,
  type CreateBoardInput,
  type UpdateBoardInput
} from "../../shared/types/board";
import { vaultDatabase } from "./vaultDatabase";

class BoardRepository {
  async list(filters: BoardListFilters = {}): Promise<Board[]> {
    const boards = await vaultDatabase.boards
      .orderBy("updatedAt")
      .reverse()
      .toArray();

    return boards.filter((board) => this.matchesFilters(board, filters));
  }

  async get(id: string): Promise<Board | null> {
    return (await vaultDatabase.boards.get(id)) ?? null;
  }

  async create(input: CreateBoardInput): Promise<Board> {
    const now = new Date().toISOString();
    const board: Board = {
      id: crypto.randomUUID(),
      name: this.requireName(input.name),
      description: this.optionalText(input.description),
      status: input.status ?? "unknown",
      chipModel: this.optionalText(input.chipModel),
      macAddress: this.optionalText(input.macAddress),
      flashSizeBytes: this.optionalNumber(input.flashSizeBytes),
      psramSizeBytes: this.optionalNumber(input.psramSizeBytes),
      crystalFrequency: this.optionalText(input.crystalFrequency),
      boardType: this.optionalText(input.boardType),
      manufacturer: this.optionalText(input.manufacturer),
      purchaseUrl: this.optionalText(input.purchaseUrl),
      physicalLocation: this.optionalText(input.physicalLocation),
      projectId: this.optionalText(input.projectId),
      notes: this.optionalText(input.notes),
      createdAt: now,
      updatedAt: now,
      lastConnectedAt: this.optionalText(input.lastConnectedAt)
    };

    this.assertStatus(board.status);
    await vaultDatabase.boards.add(board);

    return board;
  }

  async update(id: string, input: UpdateBoardInput): Promise<Board> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error("Board not found.");
    }

    const board: Board = {
      ...existing,
      name:
        input.name === undefined
          ? existing.name
          : this.requireName(input.name),
      description:
        input.description === undefined
          ? existing.description
          : this.optionalText(input.description),
      status: input.status ?? existing.status,
      chipModel:
        input.chipModel === undefined
          ? existing.chipModel
          : this.optionalText(input.chipModel),
      macAddress:
        input.macAddress === undefined
          ? existing.macAddress
          : this.optionalText(input.macAddress),
      flashSizeBytes:
        input.flashSizeBytes === undefined
          ? existing.flashSizeBytes
          : this.optionalNumber(input.flashSizeBytes),
      psramSizeBytes:
        input.psramSizeBytes === undefined
          ? existing.psramSizeBytes
          : this.optionalNumber(input.psramSizeBytes),
      crystalFrequency:
        input.crystalFrequency === undefined
          ? existing.crystalFrequency
          : this.optionalText(input.crystalFrequency),
      boardType:
        input.boardType === undefined
          ? existing.boardType
          : this.optionalText(input.boardType),
      manufacturer:
        input.manufacturer === undefined
          ? existing.manufacturer
          : this.optionalText(input.manufacturer),
      purchaseUrl:
        input.purchaseUrl === undefined
          ? existing.purchaseUrl
          : this.optionalText(input.purchaseUrl),
      physicalLocation:
        input.physicalLocation === undefined
          ? existing.physicalLocation
          : this.optionalText(input.physicalLocation),
      projectId:
        input.projectId === undefined
          ? existing.projectId
          : this.optionalText(input.projectId),
      notes:
        input.notes === undefined ? existing.notes : this.optionalText(input.notes),
      lastConnectedAt:
        input.lastConnectedAt === undefined
          ? existing.lastConnectedAt
          : this.optionalText(input.lastConnectedAt),
      updatedAt: new Date().toISOString()
    };

    this.assertStatus(board.status);
    await vaultDatabase.boards.put(board);

    return board;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.get(id);
    if (!existing) {
      return false;
    }

    await vaultDatabase.transaction(
      "rw",
      [
        vaultDatabase.boards,
        vaultDatabase.boardTags,
        vaultDatabase.firmwareHistory,
        vaultDatabase.attachments,
        vaultDatabase.pinAssignments
      ],
      async () => {
        await Promise.all([
          vaultDatabase.boardTags.where("boardId").equals(id).delete(),
          vaultDatabase.firmwareHistory.where("boardId").equals(id).delete(),
          vaultDatabase.attachments.where("boardId").equals(id).delete(),
          vaultDatabase.pinAssignments.where("boardId").equals(id).delete()
        ]);
        await vaultDatabase.boards.delete(id);
      }
    );

    return true;
  }

  async dashboardStats(): Promise<BoardDashboardStats> {
    const boards = await this.list();

    return {
      totalBoards: boards.length,
      availableBoards: boards.filter((board) => board.status === "available").length,
      inUseBoards: boards.filter((board) => board.status === "in_use").length,
      brokenBoards: boards.filter((board) => board.status === "broken").length,
      needsFlashingBoards: boards.filter(
        (board) => board.status === "needs_flashing"
      ).length,
      recentlyUpdatedBoards: boards.slice(0, 5),
      recentlyConnectedBoards: boards
        .filter((board) => Boolean(board.lastConnectedAt))
        .sort((left, right) =>
          (right.lastConnectedAt ?? "").localeCompare(left.lastConnectedAt ?? "")
        )
        .slice(0, 5)
    };
  }

  private matchesFilters(board: Board, filters: BoardListFilters): boolean {
    const search = filters.search?.trim().toLowerCase();
    const matchesSearch =
      !search ||
      [
        board.name,
        board.description,
        board.chipModel,
        board.macAddress,
        board.notes
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(search));

    const matchesStatus =
      !filters.status || filters.status === "all" || board.status === filters.status;
    const matchesChipModel =
      !filters.chipModel?.trim() || board.chipModel === filters.chipModel.trim();

    return matchesSearch && matchesStatus && matchesChipModel;
  }

  private requireName(value: string): string {
    const name = value.trim();
    if (!name) {
      throw new Error("Board name is required.");
    }

    return name;
  }

  private optionalText(value: string | null | undefined): string | null {
    const text = value?.trim();
    return text ? text : null;
  }

  private optionalNumber(value: number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (!Number.isFinite(value) || value < 0) {
      throw new Error("Numeric board fields must be positive numbers.");
    }

    return Math.trunc(value);
  }

  private assertStatus(value: BoardStatus): void {
    if (!BOARD_STATUSES.includes(value)) {
      throw new Error("Unsupported board status.");
    }
  }
}

export const boardRepository = new BoardRepository();
