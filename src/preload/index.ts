import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "../shared/ipcChannels";
import type { EspBoardVaultApi } from "../shared/types/api";
import type { ApiResult } from "../shared/types/ipc";
import type { MockDetectedBoard } from "../shared/types/serial";

async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, ...args)) as ApiResult<T>;

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data;
}

const api: EspBoardVaultApi = {
  serialDetection: {
    scanMock(): Promise<MockDetectedBoard> {
      return invoke(IPC_CHANNELS.serialDetection.scanMock);
    }
  }
};

contextBridge.exposeInMainWorld("api", api);
