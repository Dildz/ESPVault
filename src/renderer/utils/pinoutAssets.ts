// Loads the vendored GPIO Viewer pinout assets (see src/renderer/assets/pinouts,
// produced by scripts/vendor-pinouts.mjs). Board images and pin-coordinate data
// are bundled, so everything resolves locally with no network access.
import boardsIndex from "../assets/pinouts/boards.json";

export interface PinoutBoardEntry {
  name: string;
  image: string;
  pins: string;
}

export interface PinoutPin {
  gpioid: number;
  top: number;
  left: number;
  valueJustify: number;
}

export const GENERIC_BOARD_NAME = "Generic View";

const pinFiles = import.meta.glob<{ pins: PinoutPin[] }>(
  "../assets/pinouts/indicators/*.json"
);
const imageUrls = import.meta.glob<string>(
  "../assets/pinouts/devboards_images/*.png",
  { eager: true, query: "?url", import: "default" }
);

function assetKey(relativePath: string): string {
  return `../assets/pinouts/${relativePath}`;
}

export function listPinoutBoards(): PinoutBoardEntry[] {
  return boardsIndex as PinoutBoardEntry[];
}

export function getPinoutBoard(name: string | null | undefined): PinoutBoardEntry {
  const boards = listPinoutBoards();
  return (
    boards.find((board) => board.name === name) ??
    boards.find((board) => board.name === GENERIC_BOARD_NAME) ??
    boards[0]
  );
}

// Bundled image URL, or null when that board's photo was not vendored (only the
// generic image ships today; specific board images arrive with the model picker).
export function pinoutImageUrl(entry: PinoutBoardEntry): string | null {
  return imageUrls[assetKey(entry.image)] ?? null;
}

const ESP32_VARIANTS = /(S2|S3|C2|C3|C5|C6|H2|P4)/;

// Reduce a scanned chip model ("ESP32-S3", "ESP32-D0WDQ6") to a family token
// used to surface matching pinout boards.
export function chipFamilyToken(chipModel: string | null): string | null {
  if (!chipModel) {
    return null;
  }
  const normalized = chipModel.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized.includes("ESP8266") || normalized.includes("ESP8285")) {
    return "ESP8266";
  }
  const variant = normalized.match(ESP32_VARIANTS);
  if (variant) {
    return variant[1];
  }
  return normalized.includes("ESP32") ? "ESP32" : null;
}

function nameMatchesChip(name: string, token: string): boolean {
  const normalized = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (token === "ESP8266") {
    return normalized.includes("ESP8266") || normalized.includes("ESP8285");
  }
  if (token === "ESP32") {
    // Classic ESP32 only — exclude the S/C/H/P variants.
    return normalized.includes("ESP32") && !ESP32_VARIANTS.test(normalized);
  }
  return normalized.includes(token);
}

// Soft-sort: float pinout models matching the board's chip family to the top,
// Generic always first; unknown chip leaves the order untouched. The full list
// is preserved (issue #81 — chip-aware picker without hiding options).
export function sortModelNamesByChip(
  names: string[],
  chipModel: string | null
): string[] {
  const token = chipFamilyToken(chipModel);
  if (!token) {
    return names;
  }
  const generic = names.filter((name) => name === GENERIC_BOARD_NAME);
  const rest = names.filter((name) => name !== GENERIC_BOARD_NAME);
  const matches = rest.filter((name) => nameMatchesChip(name, token));
  const others = rest.filter((name) => !nameMatchesChip(name, token));
  return [...generic, ...matches, ...others];
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

// GPIO numbers that physically exist per ESP chip family, following ESP-IDF SOC
// GPIO availability. Used only on the GENERIC layout to dim pins the board's chip
// doesn't have (specific board images already show only real pins). Hand-edit if
// a family's range is off — this is a calibration table, not derived data.
const VALID_GPIOS_BY_FAMILY: Record<string, number[]> = {
  ESP32: [...range(0, 19), 21, 22, 23, 25, 26, 27, ...range(32, 39)],
  S2: [...range(0, 21), ...range(26, 46)],
  S3: [...range(0, 21), ...range(26, 48)],
  C2: range(0, 20),
  C3: range(0, 21),
  C5: range(0, 28),
  C6: range(0, 30),
  H2: range(0, 27),
  P4: range(0, 54),
  ESP8266: range(0, 16)
};

// Valid GPIO numbers for a board's chip, or null when the chip is unknown (in
// which case nothing should be dimmed).
export function validGpioNumbers(chipModel: string | null): number[] | null {
  const token = chipFamilyToken(chipModel);
  return token ? VALID_GPIOS_BY_FAMILY[token] ?? null : null;
}

interface FamilyPinRoles {
  strapping: number[];
  inputOnly: number[];
  flash: number[];
  usb: number[];
}

// Special-role GPIOs per ESP chip family, from the Espressif ESP-IDF GPIO docs
// (and the ESP8266 datasheet / ESP32-P4 chip datasheet). These are silicon facts
// — true on every board carrying the chip — used for read-only warning hints, not
// per-board wiring. Conservative where the datasheet range is board-dependent:
//   - ESP32 flash excludes 16/17 (PSRAM only on WROVER; WROOM uses them freely).
//   - ESP32-S3 flash capped at 26-32 (33-37 are octal-only).
//   - ESP32-P4 has no flash/PSRAM GPIOs — flash is on dedicated pins, PSRAM is
//     in-package.
const PIN_ROLES_BY_FAMILY: Record<string, FamilyPinRoles> = {
  ESP32: { strapping: [0, 2, 5, 12, 15], inputOnly: range(34, 39), flash: range(6, 11), usb: [] },
  S2: { strapping: [0, 45, 46], inputOnly: [46], flash: range(26, 32), usb: [19, 20] },
  S3: { strapping: [0, 3, 45, 46], inputOnly: [], flash: range(26, 32), usb: [19, 20] },
  C2: { strapping: [8, 9], inputOnly: [], flash: range(12, 17), usb: [] },
  C3: { strapping: [2, 8, 9], inputOnly: [], flash: range(12, 17), usb: [18, 19] },
  C5: { strapping: [2, 7, 25, 27, 28], inputOnly: [], flash: range(16, 22), usb: [13, 14] },
  C6: { strapping: [4, 5, 8, 9, 15], inputOnly: [], flash: range(24, 30), usb: [12, 13] },
  H2: { strapping: [2, 3, 8, 9, 25], inputOnly: [], flash: range(15, 21), usb: [26, 27] },
  P4: { strapping: range(34, 38), inputOnly: [], flash: [], usb: [24, 25, 26, 27] },
  ESP8266: { strapping: [0, 2, 15], inputOnly: [], flash: range(6, 11), usb: [] }
};

// Maps each GPIO to its special-role labels for a board's chip (e.g. 0 ->
// ["Strapping"], 46 -> ["Strapping", "Input-only"]). Empty when the chip is
// unknown.
export function pinRolesForChip(
  chipModel: string | null
): Record<number, string[]> {
  const token = chipFamilyToken(chipModel);
  const roles = token ? PIN_ROLES_BY_FAMILY[token] : null;
  if (!roles) {
    return {};
  }
  const map: Record<number, string[]> = {};
  const add = (gpios: number[], label: string): void => {
    for (const gpio of gpios) {
      (map[gpio] ??= []).push(label);
    }
  };
  add(roles.strapping, "Strapping");
  add(roles.inputOnly, "Input-only");
  add(roles.flash, "Flash");
  add(roles.usb, "USB");
  return map;
}

export async function loadPinoutPins(
  entry: PinoutBoardEntry
): Promise<PinoutPin[]> {
  const loader = pinFiles[assetKey(entry.pins)];
  if (!loader) {
    return [];
  }

  const module = await loader();
  return module.pins ?? [];
}
