import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const electronPackage = require("../node_modules/electron/package.json");
const betterSqliteDirectory = path.join(projectRoot, "node_modules", "better-sqlite3");
const prebuildInstall = path.join(
  projectRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prebuild-install.cmd" : "prebuild-install"
);

if (!existsSync(betterSqliteDirectory) || !existsSync(prebuildInstall)) {
  console.warn("Skipping native install because dependencies are not installed yet.");
  process.exit(0);
}

console.log(
  `Installing better-sqlite3 native binary for Electron ${electronPackage.version}...`
);

const result = spawnSync(
  prebuildInstall,
  ["-r", "electron", "-t", electronPackage.version],
  {
    cwd: betterSqliteDirectory,
    stdio: "inherit",
    shell: process.platform === "win32"
  }
);

if (result.status !== 0) {
  if (result.error) {
    console.error(result.error.message);
  }

  console.error(
    [
      "Could not install the Electron prebuilt better-sqlite3 binary.",
      "Use an Electron version with a published better-sqlite3 prebuild, or install Visual Studio Build Tools and rebuild the native module."
    ].join("\n")
  );
  process.exit(result.status ?? 1);
}
