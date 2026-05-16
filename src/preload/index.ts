import { contextBridge, ipcRenderer } from "electron";
import type { EspBoardVaultApi } from "../shared/types/api";

const api: EspBoardVaultApi = {
  backup: {
    open: () => ipcRenderer.invoke("backup:open") as Promise<{
      canceled: boolean;
      filePath?: string;
      content?: string;
    }>,
    save: (content, defaultFileName) =>
      ipcRenderer.invoke("backup:save", {
        content,
        defaultFileName
      }) as Promise<{
        canceled: boolean;
        filePath?: string;
      }>
  },
  clipboard: {
    writeText: (text) =>
      ipcRenderer.invoke("clipboard:write-text", text) as Promise<void>
  },
  database: {
    changeLocation: (backupContent) =>
      ipcRenderer.invoke(
        "database:change-location",
        backupContent
      ) as Promise<{
        canceled: boolean;
        indexedDbPath?: string;
        restartRequired?: boolean;
        userDataPath?: string;
      }>,
    clearPendingMove: () =>
      ipcRenderer.invoke("database:clear-pending-move") as Promise<void>,
    getLocation: () =>
      ipcRenderer.invoke("database:get-location") as Promise<{
        databaseName: string;
        defaultUserDataPath: string;
        indexedDbPath: string;
        isDefaultLocation: boolean;
        userDataPath: string;
      }>,
    getPendingMove: () =>
      ipcRenderer.invoke("database:get-pending-move") as Promise<{
        content: string;
      } | null>
  },
  serial: {
    getLastSelectionCount: () =>
      ipcRenderer.invoke("serial:get-last-selection-count") as Promise<number>
  },
  window: {
    resetSize: () => ipcRenderer.invoke("window:reset-size") as Promise<void>
  }
};

contextBridge.exposeInMainWorld("api", api);
