import { spawn } from "node:child_process";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const rootDir = process.cwd();
const releaseDir = resolve(rootDir, "release");
const stagingDir = join(
  tmpdir(),
  `esp-board-vault-package-${process.pid}-${Date.now()}`
);
const builderCli = resolve(rootDir, "node_modules", "electron-builder", "cli.js");
const forwardedArgs = process.argv.slice(2);

try {
  await rm(stagingDir, { force: true, recursive: true });
  await runNpmScript("build");
  await run(process.execPath, [
    builderCli,
    ...forwardedArgs,
    "--publish",
    "never",
    `--config.directories.output=${stagingDir}`
  ]);

  await mkdir(releaseDir, { recursive: true });
  await rm(resolveInsideRelease("win-unpacked.tmp"), {
    force: true,
    recursive: true
  });
  await copyStagedOutput();
} finally {
  await rm(stagingDir, { force: true, recursive: true });
}

async function copyStagedOutput() {
  const entries = await readdir(stagingDir, { withFileTypes: true });

  for (const entry of entries) {
    const source = join(stagingDir, entry.name);
    const destination = resolveInsideRelease(entry.name);

    await rm(destination, { force: true, recursive: true });
    await cp(source, destination, { recursive: true });
  }
}

function resolveInsideRelease(name) {
  const resolved = resolve(releaseDir, basename(name));

  if (
    resolved !== releaseDir &&
    !resolved.startsWith(`${releaseDir}${process.platform === "win32" ? "\\" : "/"}`)
  ) {
    throw new Error(`Refusing to write outside release directory: ${resolved}`);
  }

  return resolved;
}

function run(command, args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      shell: false,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited with signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}`));
        return;
      }

      resolveRun();
    });
  });
}

function runNpmScript(scriptName) {
  const npmCli = process.env.npm_execpath;

  if (npmCli) {
    return run(process.execPath, [npmCli, "run", scriptName]);
  }

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  return run(npmCommand, ["run", scriptName]);
}
