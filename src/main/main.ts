import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  screen,
  shell,
  type SaveDialogOptions,
  type OpenDialogOptions
} from "electron";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import path from "node:path";

const isDevelopment = Boolean(process.env.VITE_DEV_SERVER_URL);
const SERIAL_SELECTION_COUNT_CHANNEL = "serial:get-last-selection-count";
const CLIPBOARD_WRITE_TEXT_CHANNEL = "clipboard:write-text";
const DATABASE_CHANGE_LOCATION_CHANNEL = "database:change-location";
const DATABASE_CLEAR_PENDING_MOVE_CHANNEL = "database:clear-pending-move";
const DATABASE_LOCATION_CHANNEL = "database:get-location";
const DATABASE_PENDING_MOVE_CHANNEL = "database:get-pending-move";
const WINDOW_RESET_SIZE_CHANNEL = "window:reset-size";
const BACKUP_SAVE_CHANNEL = "backup:save";
const BACKUP_OPEN_CHANNEL = "backup:open";
const SHELL_OPEN_EXTERNAL_CHANNEL = "shell:open-external";

interface WindowSize {
  width: number;
  height: number;
}

const DEFAULT_WINDOW_SIZE: WindowSize = {
  width: 1280,
  height: 820
};
const MIN_WINDOW_SIZE: WindowSize = {
  width: 980,
  height: 680
};

let pendingSelectedSerialPortIds: string[] = [];
let lastSerialPortSelectionCount = 0;
let mainWindow: BrowserWindow | null = null;
let windowSizeSaveTimer: ReturnType<typeof setTimeout> | null = null;

interface SelectableSerialPort {
  portId: string;
  portName?: string;
  displayName?: string;
  vendorId?: string;
  productId?: string;
  serialNumber?: string;
}

app.setName("ESP Board Vault");
applyConfiguredUserDataPath();

ipcMain.handle(SERIAL_SELECTION_COUNT_CHANNEL, () => lastSerialPortSelectionCount);
ipcMain.handle(CLIPBOARD_WRITE_TEXT_CHANNEL, (_event, text: unknown) => {
  if (typeof text !== "string") {
    throw new Error("Clipboard text must be a string.");
  }

  clipboard.writeText(text);
});
ipcMain.handle(DATABASE_CHANGE_LOCATION_CHANNEL, async (event, backupContent) => {
  if (typeof backupContent !== "string" || !backupContent.trim()) {
    throw new Error("App data move content is invalid.");
  }

  const result = await showOpenDialogForSender(event.sender, {
    title: "Choose app data location",
    buttonLabel: "Move app data here",
    properties: ["openDirectory", "createDirectory"]
  });

  if (result.canceled || !result.filePaths[0]) {
    return { canceled: true };
  }

  const targetUserDataPath = path.resolve(result.filePaths[0]);
  const currentUserDataPath = path.resolve(app.getPath("userData"));

  if (isSamePath(targetUserDataPath, currentUserDataPath)) {
    return {
      canceled: false,
      indexedDbPath: path.join(currentUserDataPath, "IndexedDB"),
      restartRequired: false,
      userDataPath: currentUserDataPath
    };
  }

  assertDatabaseLocationTarget(targetUserDataPath, currentUserDataPath);
  writePendingDatabaseMove(targetUserDataPath, backupContent);
  writeWindowSizeForMove(targetUserDataPath);
  writeDatabaseLocationConfig(targetUserDataPath);
  scheduleRelaunch();

  return {
    canceled: false,
    indexedDbPath: path.join(targetUserDataPath, "IndexedDB"),
    restartRequired: true,
    userDataPath: targetUserDataPath
  };
});
ipcMain.handle(DATABASE_CLEAR_PENDING_MOVE_CHANNEL, () => {
  clearPendingDatabaseMove();
});
ipcMain.handle(DATABASE_LOCATION_CHANNEL, () => getDatabaseLocation());
ipcMain.handle(DATABASE_PENDING_MOVE_CHANNEL, () => readPendingDatabaseMove());
ipcMain.handle(WINDOW_RESET_SIZE_CHANNEL, (event) => {
  const window = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;

  if (!window) {
    throw new Error("The application window is not available.");
  }

  resetWindowSize(window);
});
ipcMain.handle(BACKUP_SAVE_CHANNEL, async (event, request: unknown) => {
  const backupRequest = parseBackupSaveRequest(request);
  const result = await showSaveDialogForSender(event.sender, {
    title: "Export backup",
    defaultPath: backupRequest.defaultFileName,
    filters: [
      { name: "ESP Board Vault Backup", extensions: ["json"] },
      { name: "JSON", extensions: ["json"] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  writeFileSync(result.filePath, backupRequest.content, "utf8");
  return { canceled: false, filePath: result.filePath };
});
ipcMain.handle(BACKUP_OPEN_CHANNEL, async (event) => {
  const result = await showOpenDialogForSender(event.sender, {
    title: "Import backup",
    properties: ["openFile"],
    filters: [
      { name: "ESP Board Vault Backup", extensions: ["json"] },
      { name: "JSON", extensions: ["json"] }
    ]
  });

  if (result.canceled || !result.filePaths[0]) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  return {
    canceled: false,
    filePath,
    content: readFileSync(filePath, "utf8")
  };
});
ipcMain.handle(SHELL_OPEN_EXTERNAL_CHANNEL, async (_event, url: unknown) => {
  if (typeof url !== "string") {
    throw new Error("External URL must be a string.");
  }

  const parsedUrl = new URL(url);
  if (!["https:", "http:"].includes(parsedUrl.protocol)) {
    throw new Error("Only http and https URLs can be opened externally.");
  }

  await shell.openExternal(parsedUrl.toString());
});

function createMainWindow(): BrowserWindow {
  const windowSize = loadWindowSize();
  const window = new BrowserWindow({
    width: windowSize.width,
    height: windowSize.height,
    minWidth: MIN_WINDOW_SIZE.width,
    minHeight: MIN_WINDOW_SIZE.height,
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

  mainWindow = window;
  persistWindowSizeChanges(window);
  configureWebSerial(window);

  if (isDevelopment && process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  return window;
}

function persistWindowSizeChanges(window: BrowserWindow): void {
  window.on("resize", () => {
    scheduleWindowSizeSave(window);
  });

  window.on("close", () => {
    saveWindowSize(window);
  });

  window.on("closed", () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });
}

function scheduleWindowSizeSave(window: BrowserWindow): void {
  if (windowSizeSaveTimer !== null) {
    clearTimeout(windowSizeSaveTimer);
  }

  windowSizeSaveTimer = setTimeout(() => {
    saveWindowSize(window);
    windowSizeSaveTimer = null;
  }, 300);
}

function resetWindowSize(window: BrowserWindow): void {
  if (window.isMaximized()) {
    window.unmaximize();
  }

  const defaultSize = normalizeWindowSize(DEFAULT_WINDOW_SIZE);
  window.setSize(defaultSize.width, defaultSize.height);
  window.center();
  saveWindowSize(window);
}

function loadWindowSize(): WindowSize {
  try {
    const rawState = readFileSync(getWindowStateFilePath(), "utf8");
    const parsedState = JSON.parse(rawState) as Partial<WindowSize>;
    return normalizeWindowSize(parsedState);
  } catch {
    return DEFAULT_WINDOW_SIZE;
  }
}

function saveWindowSize(window: BrowserWindow): void {
  if (window.isDestroyed() || window.isMinimized() || window.isFullScreen()) {
    return;
  }

  const bounds = normalizeWindowSize(window.getBounds());

  try {
    ensureVaultDataDirectory();
    writeFileSync(
      getWindowStateFilePath(),
      `${JSON.stringify(bounds, null, 2)}\n`,
      "utf8"
    );
  } catch (caughtError) {
    console.warn("Window size could not be saved.", caughtError);
  }
}

function normalizeWindowSize(size: Partial<WindowSize>): WindowSize {
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  const width = normalizeWindowDimension(
    size.width,
    MIN_WINDOW_SIZE.width,
    Math.max(MIN_WINDOW_SIZE.width, workArea.width),
    DEFAULT_WINDOW_SIZE.width
  );
  const height = normalizeWindowDimension(
    size.height,
    MIN_WINDOW_SIZE.height,
    Math.max(MIN_WINDOW_SIZE.height, workArea.height),
    DEFAULT_WINDOW_SIZE.height
  );

  return { width, height };
}

function normalizeWindowDimension(
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number
): number {
  const dimension =
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(Math.max(Math.round(dimension), minimum), maximum);
}

function getWindowStateFilePath(): string {
  return path.join(ensureVaultDataDirectory(), "window-state.json");
}

function ensureVaultDataDirectory(): string {
  return ensureVaultDataDirectoryForUserData(app.getPath("userData"));
}

function ensureVaultDataDirectoryForUserData(userDataPath: string): string {
  const directory = path.join(userDataPath, "esp-board-vault");
  mkdirSync(directory, { recursive: true });
  return directory;
}

function applyConfiguredUserDataPath(): void {
  const configuredPath = loadConfiguredUserDataPath();
  if (configuredPath && !isSamePath(configuredPath, getDefaultUserDataPath())) {
    app.setPath("userData", configuredPath);
  }
}

function loadConfiguredUserDataPath(): string | null {
  try {
    const rawConfig = readFileSync(getDatabaseLocationConfigFilePath(), "utf8");
    const parsedConfig = JSON.parse(rawConfig) as Record<string, unknown>;
    const userDataPath = parsedConfig.userDataPath;

    return typeof userDataPath === "string" && userDataPath.trim()
      ? path.resolve(userDataPath)
      : null;
  } catch {
    return null;
  }
}

function writeDatabaseLocationConfig(userDataPath: string): void {
  const config = {
    userDataPath: path.resolve(userDataPath),
    updatedAt: new Date().toISOString()
  };

  mkdirSync(path.dirname(getDatabaseLocationConfigFilePath()), { recursive: true });
  writeFileSync(
    getDatabaseLocationConfigFilePath(),
    `${JSON.stringify(config, null, 2)}\n`,
    "utf8"
  );
}

function getDatabaseLocationConfigFilePath(): string {
  return path.join(
    getDefaultUserDataPath(),
    "esp-board-vault",
    "database-location.json"
  );
}

function getDefaultUserDataPath(): string {
  return path.join(app.getPath("appData"), app.getName());
}

function getDatabaseLocation(): {
  databaseName: string;
  defaultUserDataPath: string;
  indexedDbPath: string;
  isDefaultLocation: boolean;
  userDataPath: string;
} {
  const userDataPath = app.getPath("userData");
  const defaultUserDataPath = getDefaultUserDataPath();

  return {
    databaseName: "esp-board-vault",
    defaultUserDataPath,
    indexedDbPath: path.join(userDataPath, "IndexedDB"),
    isDefaultLocation: isSamePath(userDataPath, defaultUserDataPath),
    userDataPath
  };
}

function assertDatabaseLocationTarget(
  targetUserDataPath: string,
  currentUserDataPath: string
): void {
  if (isPathInside(targetUserDataPath, currentUserDataPath)) {
    throw new Error("Choose a folder outside the current app data folder.");
  }

  if (isSamePath(targetUserDataPath, getDefaultUserDataPath())) {
    return;
  }

  mkdirSync(targetUserDataPath, { recursive: true });

  const entries = readdirSync(targetUserDataPath);
  if (entries.length > 0) {
    throw new Error("Choose an empty folder for the app data location.");
  }
}

function writePendingDatabaseMove(
  targetUserDataPath: string,
  backupContent: string
): void {
  const pendingMovePath = getPendingDatabaseMoveFilePath(targetUserDataPath);
  mkdirSync(path.dirname(pendingMovePath), { recursive: true });
  writeFileSync(pendingMovePath, backupContent, "utf8");
}

function writeWindowSizeForMove(targetUserDataPath: string): void {
  if (
    !mainWindow ||
    mainWindow.isDestroyed() ||
    mainWindow.isMinimized() ||
    mainWindow.isFullScreen()
  ) {
    return;
  }

  const bounds = normalizeWindowSize(mainWindow.getBounds());
  const targetVaultDirectory =
    ensureVaultDataDirectoryForUserData(targetUserDataPath);

  writeFileSync(
    path.join(targetVaultDirectory, "window-state.json"),
    `${JSON.stringify(bounds, null, 2)}\n`,
    "utf8"
  );
}

function readPendingDatabaseMove(): { content: string } | null {
  const pendingMovePath = getPendingDatabaseMoveFilePath(app.getPath("userData"));

  if (!existsSync(pendingMovePath)) {
    return null;
  }

  return {
    content: readFileSync(pendingMovePath, "utf8")
  };
}

function clearPendingDatabaseMove(): void {
  const pendingMovePath = getPendingDatabaseMoveFilePath(app.getPath("userData"));

  if (existsSync(pendingMovePath)) {
    unlinkSync(pendingMovePath);
  }
}

function getPendingDatabaseMoveFilePath(userDataPath: string): string {
  return path.join(userDataPath, "esp-board-vault", "pending-database-move.json");
}

function scheduleRelaunch(): void {
  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, 500);
}

function isSamePath(left: string, right: string): boolean {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

function isPathInside(candidatePath: string, parentPath: string): boolean {
  const relativePath = path.relative(
    path.resolve(parentPath),
    path.resolve(candidatePath)
  );

  return (
    Boolean(relativePath) &&
    !relativePath.startsWith("..") &&
    !path.isAbsolute(relativePath)
  );
}

function parseBackupSaveRequest(request: unknown): {
  content: string;
  defaultFileName: string;
} {
  if (
    typeof request !== "object" ||
    request === null ||
    Array.isArray(request)
  ) {
    throw new Error("Backup save request is invalid.");
  }

  const { content, defaultFileName } = request as Record<string, unknown>;

  if (typeof content !== "string" || typeof defaultFileName !== "string") {
    throw new Error("Backup save request is incomplete.");
  }

  return { content, defaultFileName };
}

function showSaveDialogForSender(
  sender: Electron.WebContents,
  options: SaveDialogOptions
): Promise<Electron.SaveDialogReturnValue> {
  const window = BrowserWindow.fromWebContents(sender);
  return window
    ? dialog.showSaveDialog(window, options)
    : dialog.showSaveDialog(options);
}

function showOpenDialogForSender(
  sender: Electron.WebContents,
  options: OpenDialogOptions
): Promise<Electron.OpenDialogReturnValue> {
  const window = BrowserWindow.fromWebContents(sender);
  return window
    ? dialog.showOpenDialog(window, options)
    : dialog.showOpenDialog(options);
}

function configureWebSerial(window: BrowserWindow): void {
  const session = window.webContents.session;

  session.setPermissionCheckHandler((_webContents, permission, origin) => {
    if ((permission as string) === "serial") {
      return isTrustedAppOrigin(origin);
    }

    return false;
  });

  session.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    if ((permission as string) === "serial") {
      callback(isTrustedAppOrigin(details.requestingUrl));
      return;
    }

    callback(false);
  });

  session.on("select-serial-port", async (event, portList, _webContents, callback) => {
    event.preventDefault();

    const queuedPortId = pendingSelectedSerialPortIds.shift();
    if (queuedPortId) {
      callback(queuedPortId);
      return;
    }

    if (portList.length <= 1) {
      lastSerialPortSelectionCount = portList.length;
      callback(portList[0]?.portId ?? "");
      return;
    }

    const selectedPorts = await showSerialPortPicker(window, portList);
    lastSerialPortSelectionCount = selectedPorts.length;
    pendingSelectedSerialPortIds = selectedPorts.slice(1).map((port) => port.portId);
    callback(selectedPorts[0]?.portId ?? "");
  });
}

function isTrustedAppOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return false;
  }

  return (
    origin.startsWith("file://") ||
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1")
  );
}

async function showSerialPortPicker<TPort extends SelectableSerialPort>(
  window: BrowserWindow,
  ports: TPort[]
): Promise<TPort[]> {
  return new Promise((resolve) => {
    let settled = false;
    const picker = new BrowserWindow({
      width: 680,
      height: 560,
      minWidth: 560,
      minHeight: 460,
      parent: window,
      modal: true,
      title: "Select ESP Boards",
      backgroundColor: "#f7f8f5",
      show: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true
      }
    });

    const finish = (selectedIndexes: number[]) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(
        selectedIndexes
          .map((index) => ports[index])
          .filter((port): port is TPort => Boolean(port))
      );
      picker.close();
    };

    picker.webContents.on("will-navigate", (event, url) => {
      if (!url.startsWith("https://esp-board-vault.local/serial-picker/")) {
        return;
      }

      event.preventDefault();
      const parsedUrl = new URL(url);

      if (parsedUrl.pathname.endsWith("/cancel")) {
        finish([]);
        return;
      }

      const indexes = (parsedUrl.searchParams.get("indexes") ?? "")
        .split(",")
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0);
      finish(indexes);
    });

    picker.on("closed", () => {
      if (!settled) {
        settled = true;
        resolve([]);
      }
    });

    picker.once("ready-to-show", () => {
      picker.show();
    });

    void picker.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        renderSerialPortPickerHtml(ports)
      )}`
    );
  });
}

function isPreferredSerialPort(port: SelectableSerialPort): boolean {
  const searchableText = [
    port.displayName,
    port.portName,
    port.vendorId,
    port.productId
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  return (
    searchableText.includes("esp") ||
    searchableText.includes("usb") ||
    searchableText.includes("jtag") ||
    searchableText.includes("cp210") ||
    searchableText.includes("ch340") ||
    searchableText.includes("ch343") ||
    searchableText.includes("wch") ||
    searchableText.includes("silicon labs")
  );
}

function renderSerialPortPickerHtml(ports: SelectableSerialPort[]): string {
  const rows = ports
    .map(
      (port, index) => `
        <label class="port-row">
          <input class="port-checkbox" type="checkbox" value="${index}" checked />
          <span class="port-body">
            <span class="port-title">
              ${escapeHtml(formatSerialPortButton(port))}
              ${isPreferredSerialPort(port) ? '<span class="badge">Suggested</span>' : ""}
            </span>
            <span class="port-detail">${escapeHtml(formatSerialPortDetail(port))}</span>
          </span>
        </label>
      `
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';" />
  <title>Select ESP Boards</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #242622;
      background: #f7f8f5;
      font-family: Segoe UI, Arial, sans-serif;
      font-size: 14px;
    }
    .shell { display: flex; flex-direction: column; min-height: 100vh; }
    header { padding: 22px 24px 14px; border-bottom: 1px solid #dcded8; }
    h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .subtitle { margin: 8px 0 0; color: #666d61; line-height: 1.4; }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 24px;
      border-bottom: 1px solid #e2e4df;
      background: #ffffff;
    }
    .toolbar-spacer { flex: 1; }
    .select-all-state { color: #596154; font-size: 13px; }
    main {
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: 14px 24px 20px;
    }
    .port-list {
      display: grid;
      gap: 8px;
    }
    .port-row {
      display: grid;
      grid-template-columns: 24px 1fr;
      gap: 12px;
      align-items: start;
      padding: 12px;
      border: 1px solid #d8dbd3;
      border-radius: 8px;
      background: #ffffff;
      cursor: pointer;
    }
    .port-row:hover { border-color: #8d9a82; }
    .port-checkbox {
      width: 18px;
      height: 18px;
      margin: 2px 0 0;
      accent-color: #466a3f;
    }
    .port-body { display: grid; gap: 4px; min-width: 0; }
    .port-title {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      font-weight: 650;
      overflow-wrap: anywhere;
    }
    .port-detail {
      color: #666d61;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .badge {
      padding: 2px 7px;
      border-radius: 999px;
      color: #2f6d3a;
      background: #e3f0e2;
      font-size: 12px;
      font-weight: 600;
    }
    footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 24px;
      border-top: 1px solid #dcded8;
      background: #ffffff;
    }
    button {
      min-height: 34px;
      padding: 0 14px;
      border: 1px solid #c6cac1;
      border-radius: 7px;
      background: #ffffff;
      color: #242622;
      font: inherit;
      cursor: pointer;
    }
    button:hover { background: #f1f3ef; }
    button.primary {
      border-color: #466a3f;
      background: #466a3f;
      color: #ffffff;
      font-weight: 650;
    }
    button.primary:hover { background: #3c5f36; }
    button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <h1>Select ESP boards</h1>
      <p class="subtitle">Choose the serial ports to scan. All detected ports are selected by default.</p>
    </header>
    <div class="toolbar">
      <button id="selectAll" type="button">Select all</button>
      <button id="clearAll" type="button">Clear</button>
      <span class="toolbar-spacer"></span>
      <span id="selectionState" class="select-all-state"></span>
    </div>
    <main>
      <div class="port-list">${rows}</div>
    </main>
    <footer>
      <button id="cancel" type="button">Cancel</button>
      <button id="scan" class="primary" type="button">Scan selected</button>
    </footer>
  </div>
  <script>
    const checkboxes = Array.from(document.querySelectorAll(".port-checkbox"));
    const scanButton = document.getElementById("scan");
    const selectionState = document.getElementById("selectionState");

    function checkedIndexes() {
      return checkboxes
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value);
    }

    function updateState() {
      const count = checkedIndexes().length;
      selectionState.textContent = count + " of " + checkboxes.length + " selected";
      scanButton.disabled = count === 0;
      scanButton.textContent = count === checkboxes.length
        ? "Scan all (" + count + ")"
        : "Scan selected (" + count + ")";
    }

    document.getElementById("selectAll").addEventListener("click", () => {
      checkboxes.forEach((checkbox) => { checkbox.checked = true; });
      updateState();
    });

    document.getElementById("clearAll").addEventListener("click", () => {
      checkboxes.forEach((checkbox) => { checkbox.checked = false; });
      updateState();
    });

    document.getElementById("cancel").addEventListener("click", () => {
      window.location.href = "https://esp-board-vault.local/serial-picker/cancel";
    });

    document.getElementById("scan").addEventListener("click", () => {
      const indexes = checkedIndexes().join(",");
      window.location.href = "https://esp-board-vault.local/serial-picker/select?indexes=" + encodeURIComponent(indexes);
    });

    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", updateState);
    });

    updateState();
  </script>
</body>
</html>`;
}

function formatSerialPortButton(port: SelectableSerialPort): string {
  return port.displayName || port.portName || port.portId;
}

function formatSerialPortDetail(port: SelectableSerialPort): string {
  const identifiers = [
    port.displayName,
    port.portName,
    formatVendorProduct(port),
    port.serialNumber ? `Serial: ${port.serialNumber}` : null
  ].filter((value): value is string => Boolean(value));

  return identifiers.join(" - ") || port.portId;
}

function formatVendorProduct(port: SelectableSerialPort): string | null {
  if (!port.vendorId && !port.productId) {
    return null;
  }

  return `VID: ${port.vendorId ?? "unknown"}, PID: ${port.productId ?? "unknown"}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
