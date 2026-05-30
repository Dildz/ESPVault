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

const localUrl = rendererServer.resolvedUrls?.local[0] ?? "http://127.0.0.1:5173/";
const harnessUrl = new URL("browser-harness.html", localUrl).toString();

console.log(`ESP Board Vault browser harness: ${harnessUrl}`);

let closing = false;

async function closeServer() {
  if (closing) {
    return;
  }

  closing = true;
  await rendererServer.close();
}

process.on("SIGINT", () => {
  void closeServer().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void closeServer().finally(() => process.exit(0));
});
