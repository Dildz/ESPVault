import {
  CHIP_FAMILY_ESP32C5,
  connect,
  formatMacAddr,
  type ESPLoader,
  type Logger
} from "tasmota-webserial-esptool";
import type { DetectedEspBoard } from "../../shared/types/serial";

type ScannerLogLevel = "log" | "debug" | "error";

interface FlashChipInfo {
  flashChipId: number | null;
  flashChipIdHex: string | null;
  flashManufacturerId: number | null;
  flashManufacturerIdHex: string | null;
  flashManufacturerName: string | null;
  flashDeviceId: number | null;
  flashDeviceIdHex: string | null;
}

interface FlashSizeInfo {
  flashSizeBytes: number | null;
  flashSizeLabel: string | null;
}

interface SecurityInfo {
  securityFlags: number | null;
  securityFlagsHex: string | null;
  flashCryptCnt: number | null;
  flashCryptCntHex: string | null;
  securityKeyPurposes: number[] | null;
  securityChipId: number | null;
  securityApiVersion: number | null;
  secureBootEnabled: boolean | null;
  flashEncryptionEnabled: boolean | null;
}

const FLASH_MANUFACTURER_NAMES: Record<number, string> = {
  0x1c: "Eon",
  0x20: "Micron",
  0x68: "Boya",
  0x85: "Puya",
  0x9d: "ISSI",
  0xbf: "SST",
  0xc2: "Macronix",
  0xc8: "GigaDevice",
  0xcd: "TH",
  0xe0: "XMC",
  0xef: "Winbond"
};

const DETECTED_FLASH_SIZE_LABELS: Record<number, string> = {
  0x12: "256KB",
  0x13: "512KB",
  0x14: "1MB",
  0x15: "2MB",
  0x16: "4MB",
  0x17: "8MB",
  0x18: "16MB",
  0x19: "32MB",
  0x1a: "64MB",
  0x1b: "128MB",
  0x1c: "256MB",
  0x20: "64MB",
  0x21: "128MB",
  0x22: "256MB",
  0x32: "256KB",
  0x33: "512KB",
  0x34: "1MB",
  0x35: "2MB",
  0x36: "4MB",
  0x37: "8MB",
  0x38: "16MB",
  0x39: "32MB",
  0x3a: "64MB"
};

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

    const scanLoader = await runStubForFlashMetadata(loader, logger);
    loader = scanLoader;

    const chipFamily = readChipFamily(loader, logger);
    const flashChipInfo = await readFlashChipInfo(loader, logger);
    const flashSizeInfo = await readFlashSize(
      loader,
      flashChipInfo.flashChipId,
      logger
    );
    const crystalFrequency = await readCrystalFrequency(loader, chipFamily, logger);
    const bootloaderOffset = readBootloaderOffset(loader, logger);
    const securityInfo = await readSecurityInfo(loader, logger);

    return {
      chipModel: loader.chipName,
      chipRevision: loader.chipRevision,
      chipVariant: loader.chipVariant,
      chipFamily,
      chipFamilyHex: formatHex(chipFamily, 4),
      macAddress: readMacAddress(loader, logger),
      ...flashSizeInfo,
      ...flashChipInfo,
      psramSizeBytes: null,
      psramDetected: null,
      crystalFrequency,
      ...securityInfo,
      bootloaderOffset,
      bootloaderOffsetHex: formatHex(bootloaderOffset, 4),
      detectedAt: new Date().toISOString(),
      logs
    };
  } finally {
    if (loader) {
      await resetAndDisconnect(loader, logger);
    }
  }
}

async function runStubForFlashMetadata(
  loader: ESPLoader,
  logger: Logger
): Promise<ESPLoader> {
  try {
    return await loader.runStub();
  } catch (error) {
    logger.error(
      `Stub loader unavailable; flash metadata may be incomplete: ${getErrorMessage(error)}`
    );
    return loader;
  }
}

async function readFlashSize(
  loader: ESPLoader,
  flashChipId: number | null,
  logger: Logger
): Promise<FlashSizeInfo> {
  let flashSizeLabel = normalizeFlashSizeLabel(loader.flashSize);

  if (!flashSizeLabel) {
    try {
      await loader.detectFlashSize();
      flashSizeLabel = normalizeFlashSizeLabel(loader.flashSize);
    } catch (error) {
      logger.error(`Flash size detection failed: ${getErrorMessage(error)}`);
    }
  }

  if (!flashSizeLabel) {
    flashSizeLabel = inferFlashSizeLabelFromFlashId(flashChipId);

    if (flashSizeLabel) {
      logger.log(`Flash size inferred from flash ID: ${flashSizeLabel}`);
    }
  }

  return {
    flashSizeBytes: parseFlashSize(flashSizeLabel),
    flashSizeLabel
  };
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

function readChipFamily(loader: ESPLoader, logger: Logger): number | null {
  try {
    return loader.getChipFamily();
  } catch (error) {
    logger.debug(`Chip family read failed: ${getErrorMessage(error)}`);
    return null;
  }
}

async function readFlashChipInfo(
  loader: ESPLoader,
  logger: Logger
): Promise<FlashChipInfo> {
  try {
    const flashChipId = await loader.flashId();
    if (!isValidFlashChipId(flashChipId)) {
      logger.debug(`Flash chip ID read returned invalid value: ${formatHex(flashChipId, 3)}`);
      return emptyFlashChipInfo();
    }

    const flashManufacturerId = flashChipId & 0xff;
    const flashDeviceId = (flashChipId >> 8) & 0xffff;

    return {
      flashChipId,
      flashChipIdHex: formatHex(flashChipId, 3),
      flashManufacturerId,
      flashManufacturerIdHex: formatHex(flashManufacturerId, 1),
      flashManufacturerName: FLASH_MANUFACTURER_NAMES[flashManufacturerId] ?? null,
      flashDeviceId,
      flashDeviceIdHex: formatHex(flashDeviceId, 2)
    };
  } catch (error) {
    logger.error(`Flash chip ID read failed: ${getErrorMessage(error)}`);
    return emptyFlashChipInfo();
  }
}

async function readSecurityInfo(
  loader: ESPLoader,
  logger: Logger
): Promise<SecurityInfo> {
  try {
    const securityInfo = await loader.getSecurityInfo();

    return {
      securityFlags: securityInfo.flags,
      securityFlagsHex: formatHex(securityInfo.flags, 4),
      flashCryptCnt: securityInfo.flashCryptCnt,
      flashCryptCntHex: formatHex(securityInfo.flashCryptCnt, 1),
      securityKeyPurposes: securityInfo.keyPurposes,
      securityChipId: securityInfo.chipId,
      securityApiVersion: securityInfo.apiVersion,
      secureBootEnabled: (securityInfo.flags & 0x01) !== 0,
      flashEncryptionEnabled: hasOddBitCount(securityInfo.flashCryptCnt)
    };
  } catch (error) {
    logger.debug(`Security info read unavailable: ${getErrorMessage(error)}`);
    return emptySecurityInfo();
  }
}

async function readCrystalFrequency(
  loader: ESPLoader,
  chipFamily: number | null,
  logger: Logger
): Promise<string | null> {
  if (chipFamily !== CHIP_FAMILY_ESP32C5) {
    return null;
  }

  try {
    const frequency = await loader.getC5CrystalFreqDetected();
    return `${frequency} MHz`;
  } catch (error) {
    logger.debug(`Crystal frequency read failed: ${getErrorMessage(error)}`);
    return null;
  }
}

function readBootloaderOffset(loader: ESPLoader, logger: Logger): number | null {
  try {
    return loader.getBootloaderOffset();
  } catch (error) {
    logger.debug(`Bootloader offset read failed: ${getErrorMessage(error)}`);
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

function normalizeFlashSizeLabel(value: string | null | undefined): string | null {
  const label = value?.trim();
  return label ? label : null;
}

function inferFlashSizeLabelFromFlashId(flashChipId: number | null): string | null {
  if (flashChipId === null) {
    return null;
  }

  const capacityCode = (flashChipId >> 16) & 0xff;
  return DETECTED_FLASH_SIZE_LABELS[capacityCode] ?? null;
}

function isValidFlashChipId(value: number): boolean {
  return value !== 0 && value !== 0xffffff;
}

function emptyFlashChipInfo(): FlashChipInfo {
  return {
    flashChipId: null,
    flashChipIdHex: null,
    flashManufacturerId: null,
    flashManufacturerIdHex: null,
    flashManufacturerName: null,
    flashDeviceId: null,
    flashDeviceIdHex: null
  };
}

function emptySecurityInfo(): SecurityInfo {
  return {
    securityFlags: null,
    securityFlagsHex: null,
    flashCryptCnt: null,
    flashCryptCntHex: null,
    securityKeyPurposes: null,
    securityChipId: null,
    securityApiVersion: null,
    secureBootEnabled: null,
    flashEncryptionEnabled: null
  };
}

function formatHex(value: number | null, bytes: number): string | null {
  if (value === null) {
    return null;
  }

  return `0x${value.toString(16).toUpperCase().padStart(bytes * 2, "0")}`;
}

function hasOddBitCount(value: number): boolean {
  let remaining = value;
  let count = 0;

  while (remaining > 0) {
    count += remaining & 1;
    remaining >>= 1;
  }

  return count % 2 === 1;
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
