import { ipcMain } from "electron";
import { IPC_CHANNELS } from "../../shared/ipcChannels";
import { SerialDetectionService } from "../services/SerialDetectionService";
import { handleIpc } from "./handleIpc";

export function registerSerialDetectionHandlers(): void {
  const serialDetectionService = new SerialDetectionService();

  ipcMain.handle(
    IPC_CHANNELS.serialDetection.scanMock,
    handleIpc(() => serialDetectionService.scanMock())
  );
}

