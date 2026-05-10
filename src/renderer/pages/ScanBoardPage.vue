<script setup lang="ts">
import { ref } from "vue";
import type { DetectedEspBoard } from "../../shared/types/serial";
import { scanEspBoard } from "../services/espBoardScanner";
import { useBoardStore } from "../stores/boardStore";
import { formatBytes, formatDate } from "../utils/boardDisplay";

const boardStore = useBoardStore();
const detectedBoard = ref<DetectedEspBoard | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const scanLogs = ref<string[]>([]);

async function runScan(): Promise<void> {
  loading.value = true;
  error.value = null;
  scanLogs.value = [];
  detectedBoard.value = null;

  try {
    detectedBoard.value = await scanEspBoard((_level, message) => {
      scanLogs.value = [...scanLogs.value.slice(-80), message];
    });
  } catch (caughtError) {
    error.value =
      caughtError instanceof Error
        ? caughtError.message
        : "The board scan could not be completed.";
  } finally {
    loading.value = false;
  }
}

async function addDetectedBoard(): Promise<void> {
  if (!detectedBoard.value) {
    return;
  }

  await boardStore.createBoard({
    name: `${detectedBoard.value.chipModel ?? "ESP32"} board`,
    status: "available",
    chipModel: detectedBoard.value.chipModel,
    macAddress: detectedBoard.value.macAddress,
    flashSizeBytes: detectedBoard.value.flashSizeBytes,
    psramSizeBytes: detectedBoard.value.psramSizeBytes,
    crystalFrequency: detectedBoard.value.crystalFrequency,
    lastConnectedAt: detectedBoard.value.detectedAt,
    notes: "Created from tasmota-webserial-esptool scan data."
  });
}
</script>

<template>
  <section class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">Scan board</h1>
        <p class="page-subtitle">
          Connect an ESP board in bootloader mode and read chip details through Web Serial.
        </p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-usb-port"
        :loading="loading"
        @click="runScan"
      >
        Scan board
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <v-card v-if="detectedBoard" flat border>
      <v-card-title class="text-subtitle-1 font-weight-bold">
        Detected board
      </v-card-title>
      <v-divider />
      <v-list>
        <v-list-item title="Chip model" :subtitle="detectedBoard.chipModel ?? 'Unknown'" />
        <v-list-item
          title="Chip revision"
          :subtitle="detectedBoard.chipRevision === null ? 'Unknown' : String(detectedBoard.chipRevision)"
        />
        <v-list-item title="Chip variant" :subtitle="detectedBoard.chipVariant ?? 'Unknown'" />
        <v-list-item title="MAC address" :subtitle="detectedBoard.macAddress ?? 'Unknown'" />
        <v-list-item
          title="Flash"
          :subtitle="detectedBoard.flashSizeLabel ?? formatBytes(detectedBoard.flashSizeBytes)"
        />
        <v-list-item title="PSRAM" :subtitle="formatBytes(detectedBoard.psramSizeBytes)" />
        <v-list-item title="Crystal" :subtitle="detectedBoard.crystalFrequency ?? 'Unknown'" />
        <v-list-item title="Detected" :subtitle="formatDate(detectedBoard.detectedAt)" />
      </v-list>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" prepend-icon="mdi-plus" @click="addDetectedBoard">
          Add to boards
        </v-btn>
      </v-card-actions>
    </v-card>

    <div v-else class="empty-state">
      <v-icon icon="mdi-usb-port" size="40" color="secondary" />
      <div class="text-subtitle-1 font-weight-bold mt-3">No board scanned yet</div>
      <div class="text-body-2 muted mt-1">
        The app will ask for a serial port, reset into the ESP bootloader, and read chip details.
      </div>
    </div>

    <v-card v-if="scanLogs.length" class="mt-4" flat border>
      <v-card-title class="text-subtitle-1 font-weight-bold">Scan log</v-card-title>
      <v-divider />
      <v-card-text>
        <pre class="scan-log">{{ scanLogs.join("\n") }}</pre>
      </v-card-text>
    </v-card>
  </section>
</template>
