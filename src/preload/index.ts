import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "../shared/ipcChannels";
import type { EspBoardVaultApi } from "../shared/types/api";
import type {
  Board,
  BoardDashboardStats,
  BoardListFilters,
  CreateBoardInput,
  UpdateBoardInput
} from "../shared/types/board";
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
  boards: {
    list(filters?: BoardListFilters): Promise<Board[]> {
      return invoke(IPC_CHANNELS.boards.list, filters);
    },
    get(id: string): Promise<Board | null> {
      return invoke(IPC_CHANNELS.boards.get, id);
    },
    create(input: CreateBoardInput): Promise<Board> {
      return invoke(IPC_CHANNELS.boards.create, input);
    },
    update(id: string, input: UpdateBoardInput): Promise<Board> {
      return invoke(IPC_CHANNELS.boards.update, id, input);
    },
    delete(id: string): Promise<boolean> {
      return invoke(IPC_CHANNELS.boards.delete, id);
    },
    dashboardStats(): Promise<BoardDashboardStats> {
      return invoke(IPC_CHANNELS.boards.dashboardStats);
    }
  },
  serialDetection: {
    scanMock(): Promise<MockDetectedBoard> {
      return invoke(IPC_CHANNELS.serialDetection.scanMock);
    }
  }
};

contextBridge.exposeInMainWorld("api", api);

