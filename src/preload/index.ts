import { contextBridge } from "electron";
import type { EspBoardVaultApi } from "../shared/types/api";

const api: EspBoardVaultApi = {};

contextBridge.exposeInMainWorld("api", api);
