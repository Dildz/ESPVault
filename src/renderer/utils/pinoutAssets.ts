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
