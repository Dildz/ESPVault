import { defineStore } from "pinia";
import { ref } from "vue";

const MAX_SCAN_LOG_LINES = 80;

export const useScanSessionStore = defineStore("scanSession", () => {
  const scanLogs = ref<string[]>([]);

  function clearScanLogs(): void {
    scanLogs.value = [];
  }

  function appendScanLog(message: string): void {
    scanLogs.value = [
      ...scanLogs.value.slice(-(MAX_SCAN_LOG_LINES - 1)),
      message
    ];
  }

  return {
    scanLogs,
    clearScanLogs,
    appendScanLog
  };
});
