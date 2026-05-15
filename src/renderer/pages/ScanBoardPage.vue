<script setup lang="ts">
import { ref } from "vue";
import type { CreateBoardInput } from "../../shared/types/board";
import type { DetectedEspBoard } from "../../shared/types/serial";
import { scanEspBoards } from "../services/espBoardScanner";
import { useBoardStore } from "../stores/boardStore";
import { formatBytes, formatDate } from "../utils/boardDisplay";

const boardStore = useBoardStore();
const detectedBoards = ref<DetectedEspBoard[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const scanLogs = ref<string[]>([]);

async function runScan(): Promise<void> {
  loading.value = true;
  error.value = null;
  scanLogs.value = [];
  detectedBoards.value = [];

  try {
    detectedBoards.value = await scanEspBoards((_level, message) => {
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

async function addDetectedBoard(board: DetectedEspBoard): Promise<void> {
  await boardStore.createBoard(buildBoardInput(board));
}

async function addDetectedBoards(): Promise<void> {
  for (const board of detectedBoards.value) {
    await addDetectedBoard(board);
  }
}

function buildBoardInput(board: DetectedEspBoard): CreateBoardInput {
  return {
    name: `${board.chipModel ?? "ESP32"} board`,
    status: "available",
    chipModel: board.chipModel,
    chipRevision: board.chipRevision,
    chipVariant: board.chipVariant,
    chipFamily: board.chipFamily,
    chipFamilyHex: board.chipFamilyHex,
    macAddress: board.macAddress,
    flashSizeBytes: board.flashSizeBytes,
    flashSizeLabel: board.flashSizeLabel,
    flashChipId: board.flashChipId,
    flashChipIdHex: board.flashChipIdHex,
    flashManufacturerId: board.flashManufacturerId,
    flashManufacturerIdHex: board.flashManufacturerIdHex,
    flashManufacturerName: board.flashManufacturerName,
    flashDeviceId: board.flashDeviceId,
    flashDeviceIdHex: board.flashDeviceIdHex,
    psramSizeBytes: board.psramSizeBytes,
    psramDetected: board.psramDetected,
    crystalFrequency: board.crystalFrequency,
    securityFlags: board.securityFlags,
    securityFlagsHex: board.securityFlagsHex,
    flashCryptCnt: board.flashCryptCnt,
    flashCryptCntHex: board.flashCryptCntHex,
    securityKeyPurposes: board.securityKeyPurposes,
    securityChipId: board.securityChipId,
    securityApiVersion: board.securityApiVersion,
    secureBootEnabled: board.secureBootEnabled,
    flashEncryptionEnabled: board.flashEncryptionEnabled,
    bootloaderOffset: board.bootloaderOffset,
    bootloaderOffsetHex: board.bootloaderOffsetHex,
    lastConnectedAt: board.detectedAt,
    notes: "Created from tasmota-webserial-esptool scan data."
  };
}

function formatBoolean(value: boolean | null): string {
  if (value === null) {
    return "Unknown";
  }

  return value ? "Enabled" : "Disabled";
}

function formatDetection(value: boolean | null): string {
  if (value === null) {
    return "Unknown";
  }

  return value ? "Detected" : "Not detected";
}

function formatNumberWithHex(value: number | null, hexValue: string | null): string {
  if (value === null && !hexValue) {
    return "Unknown";
  }

  return hexValue
    ? `${hexValue}${value === null ? "" : ` (${value})`}`
    : String(value);
}

function formatFlashManufacturer(board: DetectedEspBoard): string {
  const id = formatNumberWithHex(
    board.flashManufacturerId,
    board.flashManufacturerIdHex
  );

  if (id === "Unknown") {
    return id;
  }

  return board.flashManufacturerName ? `${board.flashManufacturerName} ${id}` : id;
}

function formatKeyPurposes(value: number[] | null): string {
  return value?.length ? value.join(", ") : "Unknown";
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
        Scan boards
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <div v-if="detectedBoards.length" class="detected-board-list">
      <div v-if="detectedBoards.length > 1" class="scan-result-actions">
        <v-btn color="primary" prepend-icon="mdi-plus" @click="addDetectedBoards">
          Add all to boards
        </v-btn>
      </div>

      <v-card
        v-for="(detectedBoard, index) in detectedBoards"
        :key="`${detectedBoard.macAddress ?? 'board'}-${detectedBoard.detectedAt}-${index}`"
        flat
        border
      >
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Detected board {{ detectedBoards.length > 1 ? index + 1 : "" }}
        </v-card-title>
        <v-divider />
        <v-list>
          <v-list-item title="Chip model" :subtitle="detectedBoard.chipModel ?? 'Unknown'" />
          <v-list-item
            title="Chip revision"
            :subtitle="detectedBoard.chipRevision === null ? 'Unknown' : String(detectedBoard.chipRevision)"
          />
          <v-list-item title="Chip variant" :subtitle="detectedBoard.chipVariant ?? 'Unknown'" />
          <v-list-item
            title="Chip family constant"
            :subtitle="formatNumberWithHex(detectedBoard.chipFamily, detectedBoard.chipFamilyHex)"
          />
          <v-list-item title="MAC address" :subtitle="detectedBoard.macAddress ?? 'Unknown'" />
          <v-list-item
            title="Flash"
            :subtitle="detectedBoard.flashSizeLabel ?? formatBytes(detectedBoard.flashSizeBytes)"
          />
          <v-list-item
            title="Flash chip ID"
            :subtitle="formatNumberWithHex(detectedBoard.flashChipId, detectedBoard.flashChipIdHex)"
          />
          <v-list-item
            title="Flash manufacturer"
            :subtitle="formatFlashManufacturer(detectedBoard)"
          />
          <v-list-item
            title="Flash device ID"
            :subtitle="formatNumberWithHex(detectedBoard.flashDeviceId, detectedBoard.flashDeviceIdHex)"
          />
          <v-list-item title="PSRAM" :subtitle="formatBytes(detectedBoard.psramSizeBytes)" />
          <v-list-item
            title="PSRAM detection"
            :subtitle="formatDetection(detectedBoard.psramDetected)"
          />
          <v-list-item title="Crystal" :subtitle="detectedBoard.crystalFrequency ?? 'Unknown'" />
          <v-list-item
            title="Secure boot"
            :subtitle="formatBoolean(detectedBoard.secureBootEnabled)"
          />
          <v-list-item
            title="Flash encryption"
            :subtitle="formatBoolean(detectedBoard.flashEncryptionEnabled)"
          />
          <v-list-item
            title="Security flags"
            :subtitle="formatNumberWithHex(detectedBoard.securityFlags, detectedBoard.securityFlagsHex)"
          />
          <v-list-item
            title="Flash crypt count"
            :subtitle="formatNumberWithHex(detectedBoard.flashCryptCnt, detectedBoard.flashCryptCntHex)"
          />
          <v-list-item
            title="Security key purposes"
            :subtitle="formatKeyPurposes(detectedBoard.securityKeyPurposes)"
          />
          <v-list-item
            title="Security chip ID"
            :subtitle="detectedBoard.securityChipId === null ? 'Unknown' : String(detectedBoard.securityChipId)"
          />
          <v-list-item
            title="Security API version"
            :subtitle="detectedBoard.securityApiVersion === null ? 'Unknown' : String(detectedBoard.securityApiVersion)"
          />
          <v-list-item
            title="Bootloader offset"
            :subtitle="formatNumberWithHex(detectedBoard.bootloaderOffset, detectedBoard.bootloaderOffsetHex)"
          />
          <v-list-item title="Detected" :subtitle="formatDate(detectedBoard.detectedAt)" />
        </v-list>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" prepend-icon="mdi-plus" @click="addDetectedBoard(detectedBoard)">
            Add to boards
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>

    <div v-else class="empty-state">
      <v-icon icon="mdi-usb-port" size="40" color="secondary" />
      <div class="text-subtitle-1 font-weight-bold mt-3">No board scanned yet</div>
      <div class="text-body-2 muted mt-1">
        The app will ask for serial ports, reset into the ESP bootloader, and read chip details.
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

<style scoped>
.detected-board-list {
  display: grid;
  gap: 16px;
}

.scan-result-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
