export interface EspBoardVaultApi {
  backup: {
    open(): Promise<BackupOpenResult>;
    save(content: string, defaultFileName: string): Promise<BackupSaveResult>;
  };
  clipboard: {
    writeText(text: string): Promise<void>;
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
