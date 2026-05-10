import { build } from "vite";

const electronExternals = [/^electron$/, /^node:/];

export async function buildElectronBundles({ minify = false } = {}) {
  await buildElectronEntry("./src/main/main.ts", "main.js", minify);
  await buildElectronEntry("./src/preload/index.ts", "preload.js", minify);
}

async function buildElectronEntry(entry, entryFileName, minify) {
  await build({
    configFile: false,
    publicDir: false,
    build: {
      ssr: entry,
      target: "node22",
      outDir: "dist-electron",
      emptyOutDir: false,
      sourcemap: true,
      minify,
      rollupOptions: {
        external: electronExternals,
        output: {
          format: "cjs",
          entryFileNames: entryFileName,
          chunkFileNames: "chunks/[name]-[hash].js"
        }
      }
    }
  });
}
