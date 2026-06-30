import { describe, expect, it } from "vitest";
import {
  GENERIC_BOARD_NAME,
  chipFamilyToken,
  sortModelNamesByChip
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
