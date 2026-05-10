import electronPath from "electron";
import { build } from "esbuild";
import { spawn } from "node:child_process";
import { createServer } from "vite";

const rendererServer = await createServer({
  configFile: "vite.config.ts",
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: false
  }
});

await rendererServer.listen();
const resolvedUrls = rendererServer.resolvedUrls;
const devServerUrl = resolvedUrls?.local[0] ?? "http://127.0.0.1:5173/";

const sharedOptions = {
  bundle: true,
  platform: "node",
  target: "node22",
  sourcemap: true,
  logLevel: "silent"
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

const { ELECTRON_RUN_AS_NODE, ...cleanEnv } = process.env;

const electronProcess = spawn(electronPath, ["."], {
  stdio: "inherit",
  env: {
    ...cleanEnv,
    VITE_DEV_SERVER_URL: devServerUrl
  }
});

electronProcess.on("exit", (code) => {
  const exitCode = code ?? 0;
  const forceExit = setTimeout(() => process.exit(exitCode), 2000);
  forceExit.unref();

  void rendererServer.close().finally(() => process.exit(exitCode));
});

process.on("SIGINT", () => {
  electronProcess.kill();
});
