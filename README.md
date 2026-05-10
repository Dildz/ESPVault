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
- Board CRUD repository backed by IndexedDB.
- Dashboard and Boards screens.
- Add/edit board dialog and delete confirmation.
- Placeholder mock scan screen.

No cloud sync, accounts, telemetry, payments, or remote services are included.
