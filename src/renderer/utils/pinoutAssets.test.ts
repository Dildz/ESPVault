import { describe, expect, it } from "vitest";
import {
  GENERIC_BOARD_NAME,
  chipFamilyToken,
  pinRolesForChip,
  sortModelNamesByChip,
  validGpioNumbers
} from "./pinoutAssets";

describe("chipFamilyToken", () => {
  it("maps variants to their token", () => {
    expect(chipFamilyToken("ESP32-S3")).toBe("S3");
    expect(chipFamilyToken("ESP32-C3 (QFN32)")).toBe("C3");
    expect(chipFamilyToken("ESP32-C6FH4")).toBe("C6");
  });

  it("maps classic and 8266 parts", () => {
    expect(chipFamilyToken("ESP32-D0WDQ6")).toBe("ESP32");
    expect(chipFamilyToken("ESP8266EX")).toBe("ESP8266");
  });

  it("returns null for unknown or empty input", () => {
    expect(chipFamilyToken(null)).toBeNull();
    expect(chipFamilyToken("RP2040")).toBeNull();
  });
});

describe("sortModelNamesByChip", () => {
  const names = [
    GENERIC_BOARD_NAME,
    "ESP32 NodeMCU 32S",
    "ESP32-S3 Super Mini",
    "XIAO ESP32 S3",
    "ESP32-C3 Mini"
  ];

  it("floats matching-chip models below Generic, keeps the full list", () => {
    const sorted = sortModelNamesByChip(names, "ESP32-S3");
    expect(sorted[0]).toBe(GENERIC_BOARD_NAME);
    expect(sorted.slice(1, 3)).toEqual(["ESP32-S3 Super Mini", "XIAO ESP32 S3"]);
    expect(sorted).toHaveLength(names.length);
  });

  it("does not misclassify variant boards as classic ESP32", () => {
    const sorted = sortModelNamesByChip(names, "ESP32-D0WDQ6");
    // Only the plain ESP32 board should float up, not the S3/C3 variants.
    expect(sorted[1]).toBe("ESP32 NodeMCU 32S");
  });

  it("leaves order untouched for an unknown chip", () => {
    expect(sortModelNamesByChip(names, null)).toEqual(names);
  });
});

describe("validGpioNumbers", () => {
  it("returns the chip's existing GPIOs", () => {
    const c3 = validGpioNumbers("ESP32-C3");
    expect(c3).toContain(21);
    expect(c3).not.toContain(22);
  });

  it("excludes gaps in the classic ESP32 range", () => {
    const esp32 = validGpioNumbers("ESP32-D0WDQ6");
    expect(esp32).toContain(23);
    expect(esp32).not.toContain(24);
    expect(esp32).not.toContain(20);
  });

  it("returns null for an unknown chip", () => {
    expect(validGpioNumbers(null)).toBeNull();
    expect(validGpioNumbers("RP2040")).toBeNull();
  });
});

describe("pinRolesForChip", () => {
  it("labels strapping, flash, and input-only pins", () => {
    const esp32 = pinRolesForChip("ESP32-D0WDQ6");
    expect(esp32[0]).toEqual(["Strapping"]);
    expect(esp32[6]).toEqual(["Flash"]);
    expect(esp32[34]).toEqual(["Input-only"]);
  });

  it("stacks multiple roles on one pin", () => {
    // ESP32-S2 GPIO46 is both a strapping pin and input-only.
    expect(pinRolesForChip("ESP32-S2")[46]).toEqual(["Strapping", "Input-only"]);
  });

  it("labels USB pins and has no flash GPIOs on P4", () => {
    const c3 = pinRolesForChip("ESP32-C3");
    expect(c3[18]).toEqual(["USB"]);
    const p4 = pinRolesForChip("ESP32-P4");
    expect(p4[24]).toEqual(["USB"]);
    expect(Object.values(p4).flat()).not.toContain("Flash");
  });

  it("returns an empty map for an unknown chip", () => {
    expect(pinRolesForChip(null)).toEqual({});
  });
});
