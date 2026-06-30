// Vendors GPIO Viewer board pinout assets (images + pin-coordinate JSON) from
// thelastoutpostworkshop/microcontroller_devkit (MIT) into the app so the pin
// layout viewer works fully offline. Run once and commit the result:
//   node scripts/vendor-pinouts.mjs
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE =
  "https://raw.githubusercontent.com/thelastoutpostworkshop/microcontroller_devkit/main/gpio_viewer_1_5/";
const OUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "renderer",
  "assets",
  "pinouts"
);

async function download(relativePath) {
  const response = await fetch(BASE + relativePath);
  if (!response.ok) {
    throw new Error(`${relativePath} -> HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function save(relativePath, buffer) {
  const target = path.join(OUT, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
}

const boardsRaw = await download("boards.json");
await save("boards.json", boardsRaw);
const boards = JSON.parse(boardsRaw.toString("utf8"));

// Bundle every board's pin-coordinate JSON (~256KB total) and every board photo.
// The photos total ~54MB raw and are committed as-is so the model picker can show
// each board's real image fully offline (no resize/recompress, no extra deps).
const bundleImage = () => true;

let bytes = 0;
let ok = 0;
const failures = [];

for (const board of boards) {
  const targets = [board.pins];
  if (bundleImage(board.image)) {
    targets.push(board.image);
  }

  for (const relativePath of targets) {
    try {
      const buffer = await download(relativePath);
      await save(relativePath, buffer);
      bytes += buffer.length;
      ok += 1;
    } catch (error) {
      failures.push(error.message);
    }
  }
}

await save(
  "ATTRIBUTION.md",
  Buffer.from(
    `# Pinout assets attribution\n\n` +
      `Board images and pin-coordinate data in this folder are vendored from\n` +
      `GPIO Viewer by The Last Outpost Workshop, licensed under the MIT License.\n\n` +
      `Source: https://github.com/thelastoutpostworkshop/microcontroller_devkit\n` +
      `(gpio_viewer_1_5). Regenerate with: node scripts/vendor-pinouts.mjs\n`,
    "utf8"
  )
);

console.log(
  `boards=${boards.length} files=${ok} size=${(bytes / 1024 / 1024).toFixed(2)}MB`
);
if (failures.length) {
  console.log(`failures (${failures.length}):\n` + failures.join("\n"));
}
