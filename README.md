# ESP Board Vault

A local-first Electron app for keeping an inventory notebook of ESP32 boards.

## Run

```bash
npm install
npm run dev
```

## Verify

```bash
npm run typecheck
npm run build
```

## Current Scope

This first vertical slice includes:

- Secure Electron shell with a typed preload API.
- Dexie/IndexedDB local database in the Vue renderer.
- Storage-neutral repository interfaces with a Dexie-backed implementation.
- Dashboard and Boards screens.
- Add/edit board dialog and delete confirmation.
- Placeholder mock scan screen.

No cloud sync, accounts, telemetry, payments, or remote services are included.

## Storage Boundary

Renderer pages should use Pinia stores, and stores should use repository
interfaces from `src/renderer/repositories`. Dexie-specific code belongs under
`src/renderer/storage/dexie`. To switch storage later, add a new implementation
and update `src/renderer/repositories/index.ts`.
