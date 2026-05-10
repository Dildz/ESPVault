import { ipcMain } from "electron";
import { IPC_CHANNELS } from "../../shared/ipcChannels";
import type {
  BoardListFilters,
  CreateBoardInput,
  UpdateBoardInput
} from "../../shared/types/board";
import type { DatabaseService } from "../database/DatabaseService";
import { BoardService } from "../services/BoardService";
import { handleIpc } from "./handleIpc";

export function registerBoardHandlers(databaseService: DatabaseService): void {
  const boardService = new BoardService(databaseService.getConnection());

  ipcMain.handle(
    IPC_CHANNELS.boards.list,
    handleIpc((filters?: BoardListFilters) => boardService.list(filters))
  );

  ipcMain.handle(
    IPC_CHANNELS.boards.get,
    handleIpc((id: string) => boardService.get(id))
  );

  ipcMain.handle(
    IPC_CHANNELS.boards.create,
    handleIpc((input: CreateBoardInput) => boardService.create(input))
  );

  ipcMain.handle(
    IPC_CHANNELS.boards.update,
    handleIpc((id: string, input: UpdateBoardInput) =>
      boardService.update(id, input)
    )
  );

  ipcMain.handle(
    IPC_CHANNELS.boards.delete,
    handleIpc((id: string) => boardService.delete(id))
  );

  ipcMain.handle(
    IPC_CHANNELS.boards.dashboardStats,
    handleIpc(() => boardService.dashboardStats())
  );
}

