import { app, BrowserWindow } from "electron";
import path from "node:path";

const isDevelopment = Boolean(process.env.VITE_DEV_SERVER_URL);

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

  configureWebSerial(window);

  if (isDevelopment && process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  return window;
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

  session.on("select-serial-port", (event, portList, _webContents, callback) => {
    event.preventDefault();
    const selectedPort = selectPreferredSerialPort(portList);
    callback(selectedPort?.portId ?? "");
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

function selectPreferredSerialPort<TPort extends { portId: string; displayName?: string }>(
  ports: TPort[]
): TPort | undefined {
  return (
    ports.find((port) => {
      const name = port.displayName?.toLowerCase() ?? "";
      return (
        name.includes("esp") ||
        name.includes("usb") ||
        name.includes("jtag") ||
        name.includes("cp210") ||
        name.includes("ch340") ||
        name.includes("wch") ||
        name.includes("silicon labs")
      );
    }) ?? ports[0]
  );
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
