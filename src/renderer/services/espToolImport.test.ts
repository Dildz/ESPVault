import { describe, expect, it } from "vitest";

describe("tasmota-webserial-esptool package contract", () => {
  it("exposes the scanner API used by ESP Board Vault", async () => {
    const espTool = await import("tasmota-webserial-esptool");

    expect(typeof espTool.connectWithPort).toBe("function");
    expect(typeof espTool.formatMacAddr).toBe("function");
    expect(typeof espTool.CHIP_FAMILY_ESP32).toBe("number");
    expect(typeof espTool.CHIP_FAMILY_ESP32C3).toBe("number");
    expect(typeof espTool.CHIP_FAMILY_ESP32C5).toBe("number");
    expect(typeof espTool.CHIP_FAMILY_ESP32S2).toBe("number");
    expect(typeof espTool.CHIP_FAMILY_ESP32S3).toBe("number");
  });
});
