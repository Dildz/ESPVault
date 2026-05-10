import { app, BrowserWindow } from "electron";
import path from "node:path";
import { DatabaseService } from "./database/DatabaseService";
import { registerBoardHandlers } from "./ipc/boardHandlers";
import { registerSerialDetectionHandlers } from "./ipc/serialDetectionHandlers";

const isDevelopment = Boolean(process.env.VITE_DEV_SERVER_URL);
let databaseService: DatabaseService | null = null;

app.setName("ESP Board Vault");

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    title: "ESP Board Vault",
    backgroundColor: "#f7f8f5",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  if (isDevelopment && process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  return window;
}

app.whenReady().then(() => {
  databaseService = new DatabaseService();
  databaseService.initialize();

  registerBoardHandlers(databaseService);
  registerSerialDetectionHandlers();

  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("before-quit", () => {
  databaseService?.close();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
