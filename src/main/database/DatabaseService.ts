import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { migrations } from "./migrations";

type SqliteDatabase = Database.Database;

export class DatabaseService {
  private db: SqliteDatabase | null = null;

  initialize(): void {
    const dataRoot = app.getPath("userData");
    const databaseDirectory = path.join(dataRoot, "database");
    const localDirectories = [
      databaseDirectory,
      path.join(dataRoot, "attachments"),
      path.join(dataRoot, "exports"),
      path.join(dataRoot, "logs")
    ];

    for (const directory of localDirectories) {
      fs.mkdirSync(directory, { recursive: true });
    }

    const databasePath = path.join(databaseDirectory, "board-vault.sqlite");
    this.db = new Database(databasePath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.runMigrations();
  }

  getConnection(): SqliteDatabase {
    if (!this.db) {
      throw new Error("Database has not been initialized.");
    }

    return this.db;
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }

  private runMigrations(): void {
    const db = this.getConnection();
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    const appliedRows = db
      .prepare("SELECT id FROM schema_migrations")
      .all() as Array<{ id: number }>;
    const appliedIds = new Set(appliedRows.map((row) => row.id));

    const applyMigration = db.transaction(() => {
      for (const migration of migrations) {
        if (appliedIds.has(migration.id)) {
          continue;
        }

        db.exec(migration.up);
        db.prepare(
          "INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)"
        ).run(migration.id, migration.name, new Date().toISOString());
      }
    });

    applyMigration();
  }
}
