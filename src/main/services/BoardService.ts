import crypto from "node:crypto";
import type Database from "better-sqlite3";
import {
  BOARD_STATUSES,
  type Board,
  type BoardDashboardStats,
  type BoardListFilters,
  type BoardStatus,
  type CreateBoardInput,
  type UpdateBoardInput
} from "../../shared/types/board";

interface BoardRow {
  id: string;
  name: string;
  description: string | null;
  status: BoardStatus;
  chip_model: string | null;
  mac_address: string | null;
  flash_size_bytes: number | null;
  psram_size_bytes: number | null;
  crystal_frequency: string | null;
  board_type: string | null;
  manufacturer: string | null;
  purchase_url: string | null;
  physical_location: string | null;
  project_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  last_connected_at: string | null;
}

interface BoardRecord {
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

export class BoardService {
  constructor(private readonly db: Database.Database) {}

  list(filters: BoardListFilters = {}): Board[] {
    const conditions: string[] = [];
    const params: Record<string, string> = {};

    if (filters.search?.trim()) {
      conditions.push(
        "(name LIKE @search OR chip_model LIKE @search OR mac_address LIKE @search OR notes LIKE @search)"
      );
      params.search = `%${filters.search.trim()}%`;
    }

    if (filters.status && filters.status !== "all") {
      this.assertStatus(filters.status);
      conditions.push("status = @status");
      params.status = filters.status;
    }

    if (filters.chipModel?.trim()) {
      conditions.push("chip_model = @chipModel");
      params.chipModel = filters.chipModel.trim();
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM boards
          ${where}
          ORDER BY datetime(updated_at) DESC, name COLLATE NOCASE ASC
        `
      )
      .all(params) as BoardRow[];

    return rows.map((row) => this.mapRow(row));
  }

  get(id: string): Board | null {
    const row = this.db
      .prepare("SELECT * FROM boards WHERE id = ?")
      .get(id) as BoardRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  create(input: CreateBoardInput): Board {
    const name = this.requireName(input.name);
    const now = new Date().toISOString();
    const record: BoardRecord = {
      id: crypto.randomUUID(),
      name,
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

    this.assertStatus(record.status);
    this.db
      .prepare(
        `
          INSERT INTO boards (
            id,
            name,
            description,
            status,
            chip_model,
            mac_address,
            flash_size_bytes,
            psram_size_bytes,
            crystal_frequency,
            board_type,
            manufacturer,
            purchase_url,
            physical_location,
            project_id,
            notes,
            created_at,
            updated_at,
            last_connected_at
          ) VALUES (
            @id,
            @name,
            @description,
            @status,
            @chipModel,
            @macAddress,
            @flashSizeBytes,
            @psramSizeBytes,
            @crystalFrequency,
            @boardType,
            @manufacturer,
            @purchaseUrl,
            @physicalLocation,
            @projectId,
            @notes,
            @createdAt,
            @updatedAt,
            @lastConnectedAt
          )
        `
      )
      .run(record);

    return this.getRequired(record.id);
  }

  update(id: string, input: UpdateBoardInput): Board {
    const existing = this.get(id);
    if (!existing) {
      throw new Error("Board not found.");
    }

    const next: BoardRecord = {
      id: existing.id,
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
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      lastConnectedAt:
        input.lastConnectedAt === undefined
          ? existing.lastConnectedAt
          : this.optionalText(input.lastConnectedAt)
    };

    this.assertStatus(next.status);
    this.db
      .prepare(
        `
          UPDATE boards
          SET
            name = @name,
            description = @description,
            status = @status,
            chip_model = @chipModel,
            mac_address = @macAddress,
            flash_size_bytes = @flashSizeBytes,
            psram_size_bytes = @psramSizeBytes,
            crystal_frequency = @crystalFrequency,
            board_type = @boardType,
            manufacturer = @manufacturer,
            purchase_url = @purchaseUrl,
            physical_location = @physicalLocation,
            project_id = @projectId,
            notes = @notes,
            updated_at = @updatedAt,
            last_connected_at = @lastConnectedAt
          WHERE id = @id
        `
      )
      .run(next);

    return this.getRequired(id);
  }

  delete(id: string): boolean {
    const result = this.db.prepare("DELETE FROM boards WHERE id = ?").run(id);
    return result.changes > 0;
  }

  dashboardStats(): BoardDashboardStats {
    const boards = this.list();

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

  private getRequired(id: string): Board {
    const board = this.get(id);
    if (!board) {
      throw new Error("Board not found after write.");
    }

    return board;
  }

  private mapRow(row: BoardRow): Board {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      chipModel: row.chip_model,
      macAddress: row.mac_address,
      flashSizeBytes: row.flash_size_bytes,
      psramSizeBytes: row.psram_size_bytes,
      crystalFrequency: row.crystal_frequency,
      boardType: row.board_type,
      manufacturer: row.manufacturer,
      purchaseUrl: row.purchase_url,
      physicalLocation: row.physical_location,
      projectId: row.project_id,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastConnectedAt: row.last_connected_at
    };
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

