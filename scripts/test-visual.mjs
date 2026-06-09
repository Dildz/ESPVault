import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { join } from "node:path";

const DEFAULT_PORT = 5173;
const MAX_PORT_ATTEMPTS = 100;
const forwardedArgs = process.argv.slice(2);

const port = process.env.BROWSER_HARNESS_PORT
  ? parseHarnessPort(process.env.BROWSER_HARNESS_PORT)
  : await findAvailablePort(DEFAULT_PORT);

const playwrightCli = join(
  process.cwd(),
  "node_modules",
  "@playwright",
  "test",
  "cli.js"
);

const child = spawn(process.execPath, [playwrightCli, "test", ...forwardedArgs], {
  env: {
    ...process.env,
    BROWSER_HARNESS_PORT: String(port)
  },
  shell: false,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error("Could not start Playwright.", error);
  process.exit(1);
});

function parseHarnessPort(value) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 65_535) {
    throw new Error(`BROWSER_HARNESS_PORT must be a valid TCP port, got "${value}".`);
  }

  return parsed;
}

async function findAvailablePort(startPort) {
  for (let offset = 0; offset < MAX_PORT_ATTEMPTS; offset += 1) {
    const candidate = startPort + offset;

    if (await isPortAvailable(candidate)) {
      return candidate;
    }
  }

  return findEphemeralPort();
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();

    server.unref();
    server.once("error", () => {
      resolve(false);
    });
    server.listen({ host: "127.0.0.1", port }, () => {
      server.close(() => {
        resolve(true);
      });
    });
  });
}

function findEphemeralPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.unref();
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close(() => {
          reject(new Error("Could not resolve an ephemeral harness port."));
        });
        return;
      }

      const { port } = address;
      server.close(() => {
        resolve(port);
      });
    });
  });
}
