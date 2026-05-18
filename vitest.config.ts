import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@renderer": fileURLToPath(new URL("./src/renderer", import.meta.url)),
      "@shared": fileURLToPath(new URL("./src/shared", import.meta.url))
    }
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/renderer/test/setupDexie.ts"]
  }
});
