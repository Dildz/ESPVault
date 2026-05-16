<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { DatabaseLocation } from "../../shared/types/api";
import type {
  VaultBackup,
  VaultBackupSummary
} from "../../shared/types/backup";
import {
  parseVaultBackup,
  summarizeVaultBackup
} from "../../shared/types/backup";
import { repositories } from "../repositories";
import { useBoardStore } from "../stores/boardStore";
import { formatBytes, formatDate } from "../utils/boardDisplay";

const boardStore = useBoardStore();
const backupRepository = repositories.backups;
const resettingWindowSize = ref(false);
const exportingBackup = ref(false);
const openingBackup = ref(false);
const importingBackup = ref(false);
const copyingDatabaseLocation = ref(false);
const changingDatabaseLocation = ref(false);
const confirmingAppDataMove = ref(false);
const error = ref<string | null>(null);
const notice = ref<string | null>(null);
const databaseLocation = ref<DatabaseLocation | null>(null);
const pendingImport = ref<{
  backup: VaultBackup;
  summary: VaultBackupSummary;
} | null>(null);

async function resetWindowSize(): Promise<void> {
  resettingWindowSize.value = true;
  error.value = null;
  notice.value = null;

  try {
    await window.api.window.resetSize();
    notice.value = "Window size reset.";
  } catch (caughtError) {
    error.value =
      caughtError instanceof Error
        ? caughtError.message
        : "The window size could not be reset.";
  } finally {
    resettingWindowSize.value = false;
  }
}

async function exportBackup(): Promise<void> {
  exportingBackup.value = true;
  error.value = null;
  notice.value = null;

  try {
    const backup = await backupRepository.exportBackup();
    const result = await window.api.backup.save(
      JSON.stringify(backup, null, 2),
      buildBackupFileName()
    );

    if (!result.canceled) {
      const fileCount = result.includedFileCount ?? 0;
      notice.value =
        fileCount > 0
          ? `Backup exported with ${fileCount} image file${fileCount === 1 ? "" : "s"}.`
          : "Backup exported.";
    }
  } catch (caughtError) {
    error.value =
      caughtError instanceof Error
        ? caughtError.message
        : "The backup could not be exported.";
  } finally {
    exportingBackup.value = false;
  }
}

async function openBackup(): Promise<void> {
  openingBackup.value = true;
  error.value = null;
  notice.value = null;
  pendingImport.value = null;

  try {
    const result = await window.api.backup.open();

    if (result.canceled) {
      return;
    }

    if (!result.content) {
      throw new Error("Backup file was empty.");
    }

    const backup = parseVaultBackup(JSON.parse(result.content) as unknown);
    pendingImport.value = {
      backup,
      summary: summarizeVaultBackup(backup)
    };
  } catch (caughtError) {
    error.value =
      caughtError instanceof Error
        ? caughtError.message
        : "The backup could not be opened.";
  } finally {
    openingBackup.value = false;
  }
}

async function importBackup(): Promise<void> {
  if (!pendingImport.value) {
    return;
  }

  importingBackup.value = true;
  error.value = null;
  notice.value = null;

  try {
    const restoredBackup = await window.api.backup.restoreFiles(
      JSON.stringify(pendingImport.value.backup)
    );
    const backup = parseVaultBackup(JSON.parse(restoredBackup.content) as unknown);
    const summary = await backupRepository.importBackup(backup);
    await boardStore.refresh();
    pendingImport.value = null;
    notice.value =
      restoredBackup.restoredFileCount > 0
        ? `Backup restored with ${totalRecords(summary)} records and ${restoredBackup.restoredFileCount} image file${restoredBackup.restoredFileCount === 1 ? "" : "s"}.`
        : `Backup restored with ${totalRecords(summary)} records.`;
  } catch (caughtError) {
    error.value =
      caughtError instanceof Error
        ? caughtError.message
        : "The backup could not be restored.";
  } finally {
    importingBackup.value = false;
  }
}

function buildBackupFileName(): string {
  const timestamp = new Date().toISOString().replaceAll(":", "-").slice(0, 19);
  return `esp-board-vault-backup-${timestamp}.json`;
}

function totalRecords(summary: VaultBackupSummary): number {
  return Object.values(summary.counts).reduce((total, count) => total + count, 0);
}

async function loadDatabaseLocation(): Promise<void> {
  try {
    databaseLocation.value = await window.api.database.getLocation();
  } catch (caughtError) {
    error.value =
      caughtError instanceof Error
        ? caughtError.message
        : "The app data location could not be loaded.";
  }
}

async function copyDatabaseLocation(): Promise<void> {
  if (!databaseLocation.value) {
    return;
  }

  copyingDatabaseLocation.value = true;
  error.value = null;
  notice.value = null;

  try {
    await window.api.clipboard.writeText(databaseLocation.value.userDataPath);
    notice.value = "App data location copied.";
  } catch (caughtError) {
    error.value =
      caughtError instanceof Error
        ? caughtError.message
        : "The app data location could not be copied.";
  } finally {
    copyingDatabaseLocation.value = false;
  }
}

async function changeDatabaseLocation(): Promise<void> {
  changingDatabaseLocation.value = true;
  confirmingAppDataMove.value = false;
  error.value = null;
  notice.value = null;

  try {
    const backup = await backupRepository.exportBackup();
    const result = await window.api.database.changeLocation(
      JSON.stringify(backup, null, 2)
    );

    if (result.canceled) {
      return;
    }

    if (result.restartRequired) {
      notice.value = "App data location changed. Restarting app...";
      return;
    }

    notice.value = "App data is already using that location.";
  } catch (caughtError) {
    error.value =
      caughtError instanceof Error
        ? caughtError.message
        : "The app data location could not be changed.";
  } finally {
    changingDatabaseLocation.value = false;
  }
}

onMounted(() => {
  void loadDatabaseLocation();
});
</script>

<template>
  <section class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Local preferences for this app.</p>
      </div>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <v-alert v-if="notice" type="success" variant="tonal" class="mb-4">
      {{ notice }}
    </v-alert>

    <v-card flat border>
      <v-card-title class="text-subtitle-1 font-weight-bold">
        Window
      </v-card-title>
      <v-divider />
      <v-card-text class="settings-row">
        <div>
          <div class="font-weight-medium">Window size</div>
          <div class="text-body-2 muted mt-1">
            Restores the default app window size.
          </div>
        </div>
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-window-restore"
          :loading="resettingWindowSize"
          @click="resetWindowSize"
        >
          Reset window size
        </v-btn>
      </v-card-text>
    </v-card>

    <v-card class="mt-4" flat border>
      <v-card-title class="text-subtitle-1 font-weight-bold">
        App data
      </v-card-title>
      <v-divider />
      <v-card-text class="settings-row">
        <div class="settings-detail">
          <div class="font-weight-medium">Current app data location</div>
          <div class="text-body-2 muted mt-1">
            Contains the local vault database and Electron profile files.
          </div>
          <div class="database-path mono mt-3">
            {{ databaseLocation?.userDataPath ?? "Loading..." }}
          </div>
          <div class="text-caption muted mt-2">
            Vault database folder: {{ databaseLocation?.indexedDbPath ?? "Loading..." }}
          </div>
        </div>
        <div class="settings-actions">
          <v-btn
            color="primary"
            variant="outlined"
            prepend-icon="mdi-folder-move-outline"
            :loading="changingDatabaseLocation"
            @click="confirmingAppDataMove = true"
          >
            Change app data location
          </v-btn>
          <v-btn
            variant="outlined"
            prepend-icon="mdi-content-copy"
            :disabled="!databaseLocation"
            :loading="copyingDatabaseLocation"
            @click="copyDatabaseLocation"
          >
            Copy app data location
          </v-btn>
        </div>
      </v-card-text>
      <v-divider />
      <v-card-text class="settings-row">
        <div>
          <div class="font-weight-medium">Backup</div>
          <div class="text-body-2 muted mt-1">
            Export or restore the local vault database and copied image files.
          </div>
        </div>
        <div class="settings-actions">
          <v-btn
            color="primary"
            prepend-icon="mdi-database-export-outline"
            :loading="exportingBackup"
            @click="exportBackup"
          >
            Export backup
          </v-btn>
          <v-btn
            variant="outlined"
            prepend-icon="mdi-database-import-outline"
            :loading="openingBackup"
            @click="openBackup"
          >
            Import backup
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-dialog v-model="confirmingAppDataMove" max-width="620" persistent>
      <v-card>
        <v-card-title>Move app data location?</v-card-title>
        <v-divider />
        <v-card-text>
          <p class="mt-0">
            The selected folder becomes the Electron app data folder for ESP Board Vault.
          </p>
          <p>
            It will contain the vault database plus profile files created by Electron and Chromium, including IndexedDB, Local Storage, Session Storage, Cache, Preferences, GPUCache, and related files.
          </p>
          <p class="mb-0">
            The vault database and current window size are migrated. Cache and profile files are recreated as needed. The app will restart after the new folder is selected.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            :disabled="changingDatabaseLocation"
            @click="confirmingAppDataMove = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            prepend-icon="mdi-folder-move-outline"
            :loading="changingDatabaseLocation"
            @click="changeDatabaseLocation"
          >
            Choose folder
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="Boolean(pendingImport)" max-width="540" persistent>
      <v-card>
        <v-card-title>Restore backup?</v-card-title>
        <v-divider />
        <v-card-text v-if="pendingImport">
          <p class="mt-0">
            This will replace the current local vault database.
          </p>
          <v-list density="compact" class="backup-summary">
            <v-list-item
              title="Exported"
              :subtitle="formatDate(pendingImport.summary.exportedAt)"
            />
            <v-list-item
              title="App version"
              :subtitle="pendingImport.summary.appVersion"
            />
            <v-list-item
              title="Boards"
              :subtitle="String(pendingImport.summary.counts.boards)"
            />
            <v-list-item
              title="Total records"
              :subtitle="String(totalRecords(pendingImport.summary))"
            />
            <v-list-item
              title="Image files"
              :subtitle="`${pendingImport.summary.fileCount} (${formatBytes(pendingImport.summary.fileSizeBytes)})`"
            />
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            :disabled="importingBackup"
            @click="pendingImport = null"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            prepend-icon="mdi-database-import-outline"
            :loading="importingBackup"
            @click="importBackup"
          >
            Restore backup
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<style scoped>
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.settings-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.settings-detail {
  min-width: 0;
}

.database-path {
  max-width: 100%;
  overflow-wrap: anywhere;
  color: #2f352f;
  font-size: 0.84rem;
}

.backup-summary {
  border: 1px solid #e1e4dc;
}

@media (max-width: 720px) {
  .settings-row {
    align-items: stretch;
    flex-direction: column;
  }

  .settings-actions {
    justify-content: stretch;
  }
}
</style>
