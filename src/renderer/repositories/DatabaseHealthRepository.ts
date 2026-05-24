export interface DatabaseIntegrityResult {
  checkedAt: string;
  databaseName: string;
  detail: string | null;
  expectedTables: string[];
  missingTables: string[];
  ok: boolean;
  schemaVersion: number | null;
}

export interface DatabaseHealthRepository {
  checkIntegrity(): Promise<DatabaseIntegrityResult>;
}
