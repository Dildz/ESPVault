import {
  connect,
  formatMacAddr,
  type ESPLoader,
  type Logger
} from "tasmota-webserial-esptool";
import type { DetectedEspBoard } from "../../shared/types/serial";

type ScannerLogLevel = "log" | "debug" | "error";

export async function scanEspBoard(
  onLog?: (level: ScannerLogLevel, message: string) => void
): Promise<DetectedEspBoard> {
  if (!("serial" in navigator)) {
    throw new Error(
      "Web Serial is not available. Use the Electron desktop app or a Chromium browser."
    );
  }

  const logs: string[] = [];
  const logger = createLogger(logs, onLog);
  let loader: ESPLoader | null = null;

  try {
    loader = await connect(logger);
    await loader.initialize();

    try {
      await loader.detectFlashSize();
    } catch (error) {
      logger.error(`Flash size detection failed: ${getErrorMessage(error)}`);
    }

    return {
      chipModel: loader.chipName,
      chipRevision: loader.chipRevision,
      chipVariant: loader.chipVariant,
      macAddress: readMacAddress(loader, logger),
      flashSizeBytes: parseFlashSize(loader.flashSize),
      flashSizeLabel: loader.flashSize,
      psramSizeBytes: null,
      crystalFrequency: null,
      detectedAt: new Date().toISOString(),
      logs
    };
  } finally {
    if (loader) {
      await resetAndDisconnect(loader, logger);
    }
  }
}

function createLogger(
  logs: string[],
  onLog?: (level: ScannerLogLevel, message: string) => void
): Logger {
  const write = (level: ScannerLogLevel, message: string, args: unknown[]) => {
    const rendered = [message, ...args.map(String)].join(" ");
    logs.push(rendered);
    onLog?.(level, rendered);
  };

  return {
    log: (message, ...args) => write("log", message, args),
    debug: (message, ...args) => write("debug", message, args),
    error: (message, ...args) => write("error", message, args)
  };
}

function readMacAddress(loader: ESPLoader, logger: Logger): string | null {
  try {
    return formatMacAddr(loader.macAddr().map(Number));
  } catch (error) {
    logger.error(`MAC address read failed: ${getErrorMessage(error)}`);
    return null;
  }
}

function parseFlashSize(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d+(?:\.\d+)?)\s*(KB|MB)$/i);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2].toUpperCase();

  if (!Number.isFinite(amount)) {
    return null;
  }

  return Math.trunc(amount * (unit === "MB" ? 1024 * 1024 : 1024));
}

async function resetAndDisconnect(loader: ESPLoader, logger: Logger): Promise<void> {
  try {
    await loader.hardReset(false);
  } catch (error) {
    logger.debug(`Reset after scan failed: ${getErrorMessage(error)}`);
  }

  try {
    await loader.disconnect();
  } catch (error) {
    logger.debug(`Disconnect after scan failed: ${getErrorMessage(error)}`);
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
