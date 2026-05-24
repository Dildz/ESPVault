import type {
  DatabaseHealthRepository,
  DatabaseIntegrityResult
} from "../../repositories/DatabaseHealthRepository";
import { vaultDatabase, type VaultDatabase } from "./vaultDatabase";

const EXPECTED_TABLES = [
  "appSettings",
  "attachments",
  "boardTags",
  "boards",
  "firmwareHistory",
  "pinAssignments",
  "projectChecklistItems",
  "projects"
];

export class DexieDatabaseHealthRepository implements DatabaseHealthRepository {
  constructor(private readonly database: VaultDatabase = vaultDatabase) {}

  async checkIntegrity(): Promise<DatabaseIntegrityResult> {
    const checkedAt = new Date().toISOString();

    try {
      await this.database.open();

      const tableNames = new Set(this.database.tables.map((table) => table.name));
      const missingTables = EXPECTED_TABLES.filter(
        (tableName) => !tableNames.has(tableName)
      );

      if (missingTables.length) {
        return this.createResult({
          checkedAt,
          detail: `Missing tables: ${missingTables.join(", ")}`,
          missingTables,
          ok: false
        });
      }

      await Promise.all(
        EXPECTED_TABLES.map((tableName) =>
          this.database.table(tableName).limit(1).toArray()
        )
      );

      return this.createResult({
        checkedAt,
        detail: null,
        missingTables: [],
        ok: true
      });
    } catch (caughtError) {
      return this.createResult({
        checkedAt,
        detail:
          caughtError instanceof Error
            ? caughtError.message
            : "The local database could not be opened.",
        missingTables: [],
        ok: false
      });
    }
  }

  private createResult(input: {
    checkedAt: string;
    detail: string | null;
    missingTables: string[];
    ok: boolean;
  }): DatabaseIntegrityResult {
    return {
      checkedAt: input.checkedAt,
      databaseName: this.database.name,
      detail: input.detail,
      expectedTables: [...EXPECTED_TABLES],
      missingTables: input.missingTables,
      ok: input.ok,
      schemaVersion: this.database.verno || null
    };
  }
}
