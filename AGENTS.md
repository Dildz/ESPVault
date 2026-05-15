# AGENTS.md - ESP Board Vault

## Project Overview

ESP Board Vault is a free, local-first desktop application for ESP32 makers.
It is a smart local notebook for remembering ESP32 boards, firmware, projects,
hardware capabilities, notes, and physical locations.

The first version is a standalone Electron desktop app built from a Vue 3 web app.
There is no hosted backend, no user accounts, no cloud sync, no payment system,
and no telemetry.

## Technical Stack

Use Electron, Vue 3, TypeScript, Vite, Vuetify 3, Pinia, Dexie, and
IndexedDB. Use `tasmota-webserial-esptool` for ESP board scanning through Web
Serial.
https://github.com/Jason2866/WebSerial_ESPTool/tree/development

Use Dexie from the Vue renderer for structured local data. The renderer must
not use Node.js APIs directly. It communicates with the main process only for
privileged operations through a typed preload API exposed with `contextBridge`.

## Architecture

```text
Vue Renderer
  -> Pinia stores
  -> Repository interfaces
  -> Storage implementation
     -> Dexie / IndexedDB for structured local data

Vue Renderer
  -> Preload API using contextBridge
  -> Electron IPC only for privileged operations
  -> Main Process Services for serial, files, export/import, and attachments
```

Structured local data belongs in the renderer storage layer. Electron main and
preload must not own board CRUD or other normal inventory CRUD unless the data
operation needs privileged OS access.

## Storage Abstraction

Keep storage replaceable. Vue pages and components must not import Dexie,
IndexedDB helpers, or concrete storage implementation files directly.

Use this dependency direction:

```text
Vue pages/components
  -> Pinia stores
  -> repository interfaces from src/renderer/repositories/
  -> implementation selected in src/renderer/repositories/index.ts
  -> concrete storage under src/renderer/storage/{provider}/
```

Current implementation:

```text
src/renderer/repositories/BoardRepository.ts
src/renderer/repositories/index.ts
src/renderer/storage/dexie/DexieBoardRepository.ts
src/renderer/storage/dexie/vaultDatabase.ts
```

When adding new data areas such as projects, firmware history, attachments
metadata, pin assignments, or settings:

1. Define a storage-neutral repository interface in `src/renderer/repositories/`.
2. Implement it under `src/renderer/storage/dexie/`.
3. Wire it through `src/renderer/repositories/index.ts`.
4. Use the repository from Pinia stores.

To switch storage in the future, add a new implementation folder such as:

```text
src/renderer/storage/file/
src/renderer/storage/sqlite/
```

Then change only the implementation wiring in
`src/renderer/repositories/index.ts` where practical.

Do not leak provider-specific types from repository interfaces. Interfaces
should use shared domain types from `src/shared/types/`.

Keep service responsibilities clear:

```text
BoardRepository
ProjectService
FirmwareHistoryService
AttachmentService
ExportImportService
```

## ESP Board Scanning

Use `tasmota-webserial-esptool` for scan and detection flows. The package is
browser/WebSerial-based, so scan orchestration belongs in the renderer. Electron
main should only handle Web Serial permission and port selection through the
session Web Serial APIs.

Current scanner path:

```text
src/renderer/pages/ScanBoardPage.vue
src/renderer/services/espBoardScanner.ts
src/main/main.ts
```

The scan flow should read chip model, chip revision, MAC address, and flash
size when available. Do not flash firmware or erase devices from the scan flow.
Reset and disconnect after scanning where practical.

## Electron Security Requirements

Use secure Electron defaults:

```ts
nodeIntegration: false
contextIsolation: true
sandbox: true
webSecurity: true
```

Do not expose raw IPC to the renderer. Do not use `remote`, insecure browser
flags, remote app content, telemetry, analytics, or tracking.

## Local Data Storage

Store all app data locally under Electron `app.getPath("userData")`:

```text
userData/
  esp-board-vault/
    database/
    attachments/
    exports/
    logs/
```

Create missing directories automatically. Never hard-code absolute user paths.

## Database Requirements

Use Dexie schema versions for IndexedDB. The first useful schema must support
`boards`, `projects`, `board_tags`, `firmware_history`, `attachments`,
`pin_assignments`, and `app_settings`.

Do not use native database modules such as `better-sqlite3`, `sqlite3`, or
native LevelDB bindings.

Dexie-specific schema and table declarations belong under
`src/renderer/storage/dexie/`. Repository interfaces must stay Dexie-free.

Binary files such as photos, firmware files, and backups must not be stored
directly in IndexedDB for the MVP. Store metadata in Dexie and copy the actual
files into Electron `userData` through the main process.

Board status values:

```text
available
in_use
needs_flashing
broken
archived
unknown
```

## First Vertical Slice

The first milestone is a working desktop app where a user can create, view,
edit, and delete ESP32 board inventory records stored in local IndexedDB.
Manual board creation is supported, and the scan screen should use
`tasmota-webserial-esptool` for Web Serial based ESP detection.

## Definition of Done

A task is done only when the app builds, relevant UI works, data persists after
restart, TypeScript types are clean, the renderer does not access Node.js
directly, and no cloud/backend/payment/telemetry code was added.
