/// <reference types="vite/client" />

import type { EspBoardVaultApi } from "../shared/types/api";

declare global {
  interface Window {
    api: EspBoardVaultApi;
  }
}

export {};

