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
