import { describe, expect, it, vi } from "vitest";
import { readBoardPartitionTable } from "./espPartitionScanner";

describe("ESP partition scanner", () => {
  it("parses a partition table from read-only flash chunks", async () => {
    const chunks = new Map<number, Uint8Array>([
      [0x8000, createPartitionEntry("nvs", 0x01, 0x02, 0x9000, 0x5000)],
      [0x8020, createPartitionEntry("spiffs", 0x01, 0x82, 0x290000, 0x170000)],
      [0x8040, createEndEntry()]
    ]);
    const loader = {
      readFlash: vi.fn(async (address: number) => {
        const chunk = chunks.get(address);
        if (!chunk) {
          throw new Error(`Unexpected read at 0x${address.toString(16)}`);
        }

        return chunk;
      })
    };
    const logger = {
      log: vi.fn(),
      debug: vi.fn(),
      error: vi.fn()
    };

    const result = await readBoardPartitionTable(loader as never, logger);

    expect(loader.readFlash).toHaveBeenCalledWith(0x8000, 32);
    expect(result.partitionTableOffset).toBe(0x8000);
    expect(result.partitionTableOffsetHex).toBe("0x00008000");
    expect(result.partitionTableReadError).toBeNull();
    expect(result.partitions).toEqual([
      {
        label: "nvs",
        type: 1,
        typeHex: "0x01",
        subtype: 2,
        subtypeHex: "0x02",
        offset: 0x9000,
        offsetHex: "0x00009000",
        sizeBytes: 0x5000,
        sizeHex: "0x00005000",
        flags: 0,
        flagsHex: "0x00000000",
        filesystem: null
      },
      {
        label: "spiffs",
        type: 1,
        typeHex: "0x01",
        subtype: 0x82,
        subtypeHex: "0x82",
        offset: 0x290000,
        offsetHex: "0x00290000",
        sizeBytes: 0x170000,
        sizeHex: "0x00170000",
        flags: 0,
        flagsHex: "0x00000000",
        filesystem: "spiffs"
      }
    ]);
  });

  it("returns a non-fatal read error when partition reads fail", async () => {
    const loader = {
      readFlash: vi.fn(async () => {
        throw new Error("serial timeout");
      })
    };
    const logger = {
      log: vi.fn(),
      debug: vi.fn(),
      error: vi.fn()
    };

    const result = await readBoardPartitionTable(loader as never, logger);

    expect(result.partitions).toBeNull();
    expect(result.partitionTableOffset).toBeNull();
    expect(result.partitionTableReadError).toBe("serial timeout");
    expect(logger.debug).toHaveBeenCalledWith(
      "Partition table read failed: serial timeout"
    );
  });
});

function createPartitionEntry(
  label: string,
  type: number,
  subtype: number,
  offset: number,
  sizeBytes: number
): Uint8Array {
  const entry = new Uint8Array(32);
  const view = new DataView(entry.buffer);
  view.setUint16(0, 0x50aa, true);
  view.setUint8(2, type);
  view.setUint8(3, subtype);
  view.setUint32(4, offset, true);
  view.setUint32(8, sizeBytes, true);
  view.setUint32(28, 0, true);
  entry.set(new TextEncoder().encode(label).slice(0, 16), 12);

  return entry;
}

function createEndEntry(): Uint8Array {
  const entry = new Uint8Array(32);
  new DataView(entry.buffer).setUint16(0, 0xffff, true);
  return entry;
}
