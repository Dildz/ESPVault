import { describe, expect, it } from "vitest";
import type { Board, UpdateBoardInput } from "../../shared/types/board";
import type { DetectedEspBoard } from "../../shared/types/serial";
import { buildBoardUpdateInput } from "./boardScanMerge";

// Minimal fixtures: only the fields buildBoardUpdateInput reads matter; cast the
// rest so the test stays small.
function detected(overrides: Partial<DetectedEspBoard> = {}): DetectedEspBoard {
  return {
    chipModel: null,
    chipRevision: null,
    chipVariant: null,
    chipFamily: null,
    chipFamilyHex: null,
    macAddress: null,
    flashSizeBytes: null,
    flashSizeLabel: null,
    flashChipId: null,
    flashChipIdHex: null,
    flashManufacturerId: null,
    flashManufacturerIdHex: null,
    flashManufacturerName: null,
    flashDeviceId: null,
    flashDeviceIdHex: null,
    psramSizeBytes: null,
    psramDetected: null,
    crystalFrequency: null,
    securityFlags: null,
    securityFlagsHex: null,
    flashCryptCnt: null,
    flashCryptCntHex: null,
    securityKeyPurposes: null,
    securityChipId: null,
    securityApiVersion: null,
    secureBootEnabled: null,
    flashEncryptionEnabled: null,
    bootloaderOffset: null,
    bootloaderOffsetHex: null,
    partitions: null,
    partitionTableOffset: null,
    partitionTableOffsetHex: null,
    partitionsDetectedAt: null,
    partitionTableReadError: null,
    detectedAt: "2026-07-01T00:00:00.000Z",
    logs: [],
    ...overrides
  } as DetectedEspBoard;
}

function saved(overrides: Partial<Board> = {}): Board {
  return {
    id: "board-1",
    name: "My manual ESP8266",
    chipModel: null,
    macAddress: null,
    partitions: null,
    ...overrides
  } as Board;
}

describe("buildBoardUpdateInput", () => {
  it("fills a manual entry's empty hardware fields from the scan", () => {
    const result = buildBoardUpdateInput(
      detected({ chipModel: "ESP8266", macAddress: "AA:BB:CC:DD:EE:FF" }),
      saved()
    );

    expect(result.chipModel).toBe("ESP8266");
    expect(result.macAddress).toBe("AA:BB:CC:DD:EE:FF");
    expect(result.lastScannedAt).toBe("2026-07-01T00:00:00.000Z");
  });

  it("keeps the existing value when the scan reads null", () => {
    const result = buildBoardUpdateInput(
      detected({ chipModel: "ESP8266", macAddress: null }),
      saved({ macAddress: "11:22:33:44:55:66" })
    );

    expect(result.macAddress).toBe("11:22:33:44:55:66");
  });

  it("never touches user-owned fields (name/photo/notes stay out of the patch)", () => {
    const result = buildBoardUpdateInput(detected({ chipModel: "ESP8266" }), saved());

    for (const key of ["name", "coverImagePath", "notes", "tags", "status"]) {
      expect(key in (result as Record<string, unknown>)).toBe(false);
    }
  });

  it("keeps existing partitions when the scan hit a read error", () => {
    const existingPartitions = [{ label: "app" }] as Board["partitions"];
    const result: UpdateBoardInput = buildBoardUpdateInput(
      detected({ partitionTableReadError: "read failed", partitions: null }),
      saved({ partitions: existingPartitions })
    );

    expect(result.partitions).toBe(existingPartitions);
    expect(result.partitionTableReadError).toBe("read failed");
  });
});
