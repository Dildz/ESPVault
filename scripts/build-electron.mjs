import { build } from "esbuild";

const sharedOptions = {
  bundle: true,
  platform: "node",
  target: "node22",
  sourcemap: true,
  logLevel: "info"
};

await build({
  ...sharedOptions,
  entryPoints: ["src/main/main.ts"],
  outfile: "dist-electron/main.js",
  format: "cjs",
  external: ["electron", "better-sqlite3"]
});

await build({
  ...sharedOptions,
  entryPoints: ["src/preload/index.ts"],
  outfile: "dist-electron/preload.js",
  format: "cjs",
  external: ["electron"]
});

