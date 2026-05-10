# AGENTS.md - ESP Board Vault

## Project Overview

ESP Board Vault is a free, local-first desktop application for ESP32 makers.
It is a smart local notebook for remembering ESP32 boards, firmware, projects,
hardware capabilities, notes, and physical locations.

The first version is a standalone Electron desktop app built from a Vue 3 web app.
There is no hosted backend, no user accounts, no cloud sync, no payment system,
and no telemetry.

## Technical Stack

Use Electron, Vue 3, TypeScript, Vite, Vuetify 3, Pinia, SQLite, and
`better-sqlite3`.

The Vue renderer must not use Node.js APIs directly. It communicates with the
main process only through a typed preload API exposed with `contextBridge`.

## Architecture

```text
Vue Renderer
  -> Preload API using contextBridge
  -> Electron IPC
  -> Main Process Services
  -> SQLite database + local file storage
```

Keep service responsibilities clear:

```text
BoardService
ProjectService
FirmwareHistoryService
AttachmentService
SerialDetectionService
ExportImportService
DatabaseService
```

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
      board-vault.sqlite
    attachments/
    exports/
    logs/
```

Create missing directories automatically. Never hard-code absolute user paths.

## Database Requirements

Use SQLite migrations. The first useful schema must support `boards`; later
schemas should add projects, tags, firmware history, attachments, pin
assignments, and settings.

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
edit, and delete ESP32 board inventory records stored in a local SQLite
database. Manual board creation is enough. ESP32 serial detection should be
represented by a placeholder service and placeholder UI.

## Definition of Done

A task is done only when the app builds, relevant UI works, data persists after
restart, TypeScript types are clean, the renderer does not access Node.js
directly, and no cloud/backend/payment/telemetry code was added.

