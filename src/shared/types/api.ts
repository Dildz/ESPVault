export interface EspBoardVaultApi {
  backup: {
    open(): Promise<BackupOpenResult>;
    save(content: string, defaultFileName: string): Promise<BackupSaveResult>;
  };
  clipboard: {
    writeText(text: string): Promise<void>;
  };
  database: {
    changeLocation(backupContent: string): Promise<DatabaseChangeLocationResult>;
    clearPendingMove(): Promise<void>;
    getLocation(): Promise<DatabaseLocation>;
    getPendingMove(): Promise<DatabasePendingMove | null>;
  };
  serial: {
    getLastSelectionCount(): Promise<number>;
  };
  window: {
    resetSize(): Promise<void>;
  };
}

export interface BackupSaveResult {
  canceled: boolean;
  filePath?: string;
}

export interface BackupOpenResult extends BackupSaveResult {
  content?: string;
}

export interface DatabaseLocation {
  databaseName: string;
  defaultUserDataPath: string;
  indexedDbPath: string;
  isDefaultLocation: boolean;
  userDataPath: string;
}

export interface DatabaseChangeLocationResult {
  canceled: boolean;
  indexedDbPath?: string;
  restartRequired?: boolean;
  userDataPath?: string;
}

export interface DatabasePendingMove {
  content: string;
}
