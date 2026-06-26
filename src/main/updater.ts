import { existsSync } from "node:fs";
import path from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";
import electronUpdater from "electron-updater";
import type {
  UpdateCapability,
  UpdateCheckResult,
  UpdateDownloadProgress,
  UpdateUnsupportedReason
} from "../shared/types/api";

const { autoUpdater } = electronUpdater;

const UPDATER_GET_CAPABILITY_CHANNEL = "updater:get-capability";
const UPDATER_CHECK_CHANNEL = "updater:check";
const UPDATER_DOWNLOAD_AND_INSTALL_CHANNEL = "updater:download-and-install";
const UPDATER_DOWNLOAD_PROGRESS_CHANNEL = "updater:download-progress";

export function registerUpdaterHandlers(): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("download-progress", (progress) => {
    broadcastDownloadProgress({
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    });
  });

  autoUpdater.on("update-downloaded", () => {
    // Silent install, then relaunch onto the new version. The assisted NSIS
    // installer may briefly flash its window before the relaunch.
    autoUpdater.quitAndInstall(true, true);
  });

  ipcMain.handle(UPDATER_GET_CAPABILITY_CHANNEL, () => getUpdateCapability());
  ipcMain.handle(UPDATER_CHECK_CHANNEL, () => checkForUpdate());
  ipcMain.handle(UPDATER_DOWNLOAD_AND_INSTALL_CHANNEL, () => downloadUpdate());
}

function getUpdateCapability(): UpdateCapability {
  const reason = getUnsupportedReason();
  return {
    supported: reason === null,
    reason,
    currentVersion: app.getVersion()
  };
}

function getUnsupportedReason(): UpdateUnsupportedReason | null {
  if (!app.isPackaged) {
    return "dev";
  }

  if (process.platform === "darwin") {
    return "macos";
  }

  if (process.platform === "linux") {
    return process.env.APPIMAGE ? null : "linux-non-appimage";
  }

  if (process.platform === "win32") {
    // ponytail: heuristic — the NSIS install ships an "Uninstall <app>.exe" next
    // to the binary; the portable zip does not. One electron-builder run emits
    // both targets from the same files, so a baked-in flag can't tell them apart.
    const uninstaller = path.join(
      path.dirname(app.getPath("exe")),
      `Uninstall ${app.getName()}.exe`
    );
    return existsSync(uninstaller) ? null : "windows-portable";
  }

  return "unknown";
}

async function checkForUpdate(): Promise<UpdateCheckResult> {
  if (getUnsupportedReason() !== null) {
    return { available: false, version: null };
  }

  const result = await autoUpdater.checkForUpdates();

  return {
    available: Boolean(result?.isUpdateAvailable),
    version: result?.updateInfo?.version ?? null
  };
}

async function downloadUpdate(): Promise<void> {
  if (getUnsupportedReason() !== null) {
    throw new Error("Updates are not available for this installation.");
  }

  // Resolves when the download finishes; the update-downloaded handler then
  // quits and installs.
  await autoUpdater.downloadUpdate();
}

function broadcastDownloadProgress(progress: UpdateDownloadProgress): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(UPDATER_DOWNLOAD_PROGRESS_CHANNEL, progress);
  }
}
