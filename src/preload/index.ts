import { contextBridge, ipcRenderer } from "electron";
import type { EspBoardVaultApi } from "../shared/types/api";

const api: EspBoardVaultApi = {
  serial: {
    getLastSelectionCount: () =>
      ipcRenderer.invoke("serial:get-last-selection-count") as Promise<number>
  }
};

contextBridge.exposeInMainWorld("api", api);
