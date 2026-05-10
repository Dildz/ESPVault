<script setup lang="ts">
import { ref } from "vue";
import type { MockDetectedBoard } from "../../shared/types/serial";
import { useBoardStore } from "../stores/boardStore";
import { formatBytes, formatDate } from "../utils/boardDisplay";

const boardStore = useBoardStore();
const detectedBoard = ref<MockDetectedBoard | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

async function runMockScan(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    detectedBoard.value = await window.api.serialDetection.scanMock();
  } catch (caughtError) {
    error.value =
      caughtError instanceof Error
        ? caughtError.message
        : "The mock scan could not be completed.";
  } finally {
    loading.value = false;
  }
}

async function addDetectedBoard(): Promise<void> {
  if (!detectedBoard.value) {
    return;
  }

  await boardStore.createBoard({
    name: `${detectedBoard.value.chipModel} board`,
    status: "available",
    chipModel: detectedBoard.value.chipModel,
    macAddress: detectedBoard.value.macAddress,
    flashSizeBytes: detectedBoard.value.flashSizeBytes,
    psramSizeBytes: detectedBoard.value.psramSizeBytes,
    crystalFrequency: detectedBoard.value.crystalFrequency,
    lastConnectedAt: detectedBoard.value.detectedAt,
    notes: "Created from mock scan data."
  });
}
</script>

<template>
  <section class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">Scan board</h1>
        <p class="page-subtitle">
          This placeholder keeps serial detection behind the main-process service boundary.
        </p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-usb-port"
        :loading="loading"
        @click="runMockScan"
      >
        Run mock scan
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <v-card v-if="detectedBoard" flat border>
      <v-card-title class="text-subtitle-1 font-weight-bold">
        Mock detected board
      </v-card-title>
      <v-divider />
      <v-list>
        <v-list-item title="Chip model" :subtitle="detectedBoard.chipModel" />
        <v-list-item title="MAC address" :subtitle="detectedBoard.macAddress" />
        <v-list-item title="Flash" :subtitle="formatBytes(detectedBoard.flashSizeBytes)" />
        <v-list-item title="PSRAM" :subtitle="formatBytes(detectedBoard.psramSizeBytes)" />
        <v-list-item title="Crystal" :subtitle="detectedBoard.crystalFrequency" />
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
      <div class="text-subtitle-1 font-weight-bold mt-3">Serial scan placeholder</div>
      <div class="text-body-2 muted mt-1">
        Real ESP32 detection can be added later without changing the renderer contract.
      </div>
    </div>
  </section>
</template>

