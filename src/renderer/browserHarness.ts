import type { CreateBoardInput } from "../shared/types/board";
import { installBrowserHarnessApi } from "./browserHarnessApi";
import { repositories } from "./repositories";

installBrowserHarnessApi();

void seedBrowserHarnessData().finally(() => {
  void import("./main");
});

async function seedBrowserHarnessData(): Promise<void> {
  const existingBoards = await repositories.boards.list();

  if (existingBoards.length) {
    return;
  }

  await Promise.all(
    sampleBoards.map((board) => repositories.boards.create(board))
  );
}

const sampleBoards: CreateBoardInput[] = [
  {
    name: "Workbench ESP32 DevKit",
    description: "General-purpose bench board for quick serial tests.",
    status: "in_use",
    chipModel: "ESP32",
    chipRevision: 3,
    macAddress: "24:6F:28:AA:10:01",
    flashSizeBytes: 4 * 1024 * 1024,
    psramDetected: false,
    boardType: "DevKit",
    manufacturer: "Espressif",
    physicalLocation: "Main bench drawer",
    notes: "Used for browser harness visual checks.",
    lastConnectedAt: "2026-05-30T14:15:00.000Z",
    lastScannedAt: "2026-05-30T14:15:00.000Z"
  },
  {
    name: "Sensor Node S3",
    description: "Prototype node with display and PSRAM enabled firmware.",
    status: "available",
    chipModel: "ESP32-S3",
    chipRevision: 1,
    macAddress: "30:AE:A4:BB:20:02",
    flashSizeBytes: 8 * 1024 * 1024,
    psramDetected: true,
    psramSizeBytes: 8 * 1024 * 1024,
    boardType: "ESP32-S3 module",
    manufacturer: "Espressif",
    physicalLocation: "Project bin A",
    lastConnectedAt: "2026-05-28T18:40:00.000Z",
    lastScannedAt: "2026-05-28T18:40:00.000Z"
  },
  {
    name: "Compact C3 Recovery Board",
    description: "Small RISC-V board awaiting a firmware refresh.",
    status: "needs_flashing",
    chipModel: "ESP32-C3",
    chipRevision: 4,
    macAddress: "7C:DF:A1:CC:30:03",
    flashSizeBytes: 4 * 1024 * 1024,
    psramDetected: false,
    boardType: "ESP32-C3 mini",
    manufacturer: "Espressif",
    physicalLocation: "Repair tray",
    notes: "Seeded so filter menus have multiple chip models and statuses."
  }
];
