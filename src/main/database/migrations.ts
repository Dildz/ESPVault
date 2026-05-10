export interface Migration {
  id: number;
  name: string;
  up: string;
}

export const migrations: Migration[] = [
  {
    id: 1,
    name: "create_boards",
    up: `
      CREATE TABLE IF NOT EXISTS boards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'unknown'
          CHECK (status IN ('available', 'in_use', 'needs_flashing', 'broken', 'archived', 'unknown')),
        chip_model TEXT,
        mac_address TEXT,
        flash_size_bytes INTEGER,
        psram_size_bytes INTEGER,
        crystal_frequency TEXT,
        board_type TEXT,
        manufacturer TEXT,
        purchase_url TEXT,
        physical_location TEXT,
        project_id TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_connected_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_boards_status ON boards(status);
      CREATE INDEX IF NOT EXISTS idx_boards_chip_model ON boards(chip_model);
      CREATE INDEX IF NOT EXISTS idx_boards_updated_at ON boards(updated_at);
      CREATE INDEX IF NOT EXISTS idx_boards_last_connected_at ON boards(last_connected_at);
    `
  }
];

