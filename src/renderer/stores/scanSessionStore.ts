import { defineStore } from "pinia";
import { ref } from "vue";

const MAX_SCAN_LOG_LINES = 80;

export const useScanSessionStore = defineStore("scanSession", () => {
  const scanLogs = ref<string[]>([]);
  const handledScanRequestId = ref(0);

  function clearScanLogs(): void {
    scanLogs.value = [];
  }

  function appendScanLog(message: string): void {
    scanLogs.value = [
      ...scanLogs.value.slice(-(MAX_SCAN_LOG_LINES - 1)),
      message
    ];
  }

  function hasHandledScanRequest(scanRequestId: number): boolean {
    return scanRequestId <= handledScanRequestId.value;
  }

  function markScanRequestHandled(scanRequestId: number): void {
    handledScanRequestId.value = Math.max(
      handledScanRequestId.value,
      scanRequestId
    );
  }

  return {
    scanLogs,
    clearScanLogs,
    appendScanLog,
    hasHandledScanRequest,
    markScanRequestHandled
  };
});
