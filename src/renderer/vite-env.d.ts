/// <reference types="vite/client" />
/// <reference types="w3c-web-serial" />

import type { EspBoardVaultApi } from "../shared/types/api";

declare global {
  interface Window {
    api: EspBoardVaultApi;
  }
}

export {};
