<script setup lang="ts">
import { computed, onMounted, reactive, watch } from "vue";
import { storeToRefs } from "pinia";
import {
  BOARD_STATUSES,
  type Board,
  type BoardStatus,
  type CreateBoardInput
} from "../../shared/types/board";
import { BOARD_STATUS_LABELS, formatDate } from "../utils/boardDisplay";
import { useProjectStore } from "../stores/projectStore";

type OptionalNumericField = number | string | null;
type OptionalBooleanField = boolean | null;

interface BoardForm {
  name: string;
  description: string;
  status: BoardStatus;
  chipModel: string;
  chipRevision: OptionalNumericField;
  chipVariant: string;
  chipFamily: OptionalNumericField;
  chipFamilyHex: string;
  macAddress: string;
  flashSizeBytes: OptionalNumericField;
  flashSizeLabel: string;
  flashChipId: OptionalNumericField;
  flashChipIdHex: string;
  flashManufacturerId: OptionalNumericField;
  flashManufacturerIdHex: string;
  flashManufacturerName: string;
  flashDeviceId: OptionalNumericField;
  flashDeviceIdHex: string;
  psramSizeBytes: OptionalNumericField;
  psramDetected: OptionalBooleanField;
  crystalFrequency: string;
  securityFlags: OptionalNumericField;
  securityFlagsHex: string;
  flashCryptCnt: OptionalNumericField;
  flashCryptCntHex: string;
  securityKeyPurposes: string;
  securityChipId: OptionalNumericField;
  securityApiVersion: OptionalNumericField;
  secureBootEnabled: OptionalBooleanField;
  flashEncryptionEnabled: OptionalBooleanField;
  bootloaderOffset: OptionalNumericField;
  bootloaderOffsetHex: string;
  boardType: string;
  manufacturer: string;
  purchaseUrl: string;
  physicalLocation: string;
  projectId: string;
  lastConnectedAt: string;
  notes: string;
}

const props = defineProps<{
  modelValue: boolean;
  board: Board | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  save: [input: CreateBoardInput];
}>();

const form = reactive<BoardForm>(emptyForm());
const projectStore = useProjectStore();
const { projects } = storeToRefs(projectStore);
const isEditing = computed(() => Boolean(props.board));
const title = computed(() => (isEditing.value ? "Edit board" : "Add board"));
const statusOptions = BOARD_STATUSES.map((status) => ({
  title: BOARD_STATUS_LABELS[status],
  value: status
}));
const projectOptions = computed(() => [
  { title: "No project", value: "" },
  ...projects.value.map((project) => ({
    title: project.name,
    value: project.id
  }))
]);
const booleanOptions = [
  { title: "Unknown", value: null },
  { title: "Yes", value: true },
  { title: "No", value: false }
];
const recordId = computed(() => props.board?.id ?? "Not saved yet");
const createdAt = computed(() => formatDate(props.board?.createdAt ?? null));
const updatedAt = computed(() => formatDate(props.board?.updatedAt ?? null));

watch(
  () => [props.modelValue, props.board] as const,
  () => {
    if (props.modelValue) {
      resetForm(props.board);
    }
  },
  { immediate: true }
);

onMounted(() => {
  void projectStore.loadProjects();
});

function emptyForm(): BoardForm {
  return {
    name: "",
    description: "",
    status: "available",
    chipModel: "",
    chipRevision: null,
    chipVariant: "",
    chipFamily: null,
    chipFamilyHex: "",
    macAddress: "",
    flashSizeBytes: null,
    flashSizeLabel: "",
    flashChipId: null,
    flashChipIdHex: "",
    flashManufacturerId: null,
    flashManufacturerIdHex: "",
    flashManufacturerName: "",
    flashDeviceId: null,
    flashDeviceIdHex: "",
    psramSizeBytes: null,
    psramDetected: null,
    crystalFrequency: "",
    securityFlags: null,
    securityFlagsHex: "",
    flashCryptCnt: null,
    flashCryptCntHex: "",
    securityKeyPurposes: "",
    securityChipId: null,
    securityApiVersion: null,
    secureBootEnabled: null,
    flashEncryptionEnabled: null,
    bootloaderOffset: null,
    bootloaderOffsetHex: "",
    boardType: "",
    manufacturer: "",
    purchaseUrl: "",
    physicalLocation: "",
    projectId: "",
    lastConnectedAt: "",
    notes: ""
  };
}

function resetForm(board: Board | null): void {
  const next = board
    ? {
        name: board.name,
        description: board.description ?? "",
        status: board.status,
        chipModel: board.chipModel ?? "",
        chipRevision: board.chipRevision,
        chipVariant: board.chipVariant ?? "",
        chipFamily: board.chipFamily,
        chipFamilyHex: board.chipFamilyHex ?? "",
        macAddress: board.macAddress ?? "",
        flashSizeBytes: board.flashSizeBytes,
        flashSizeLabel: board.flashSizeLabel ?? "",
        flashChipId: board.flashChipId,
        flashChipIdHex: board.flashChipIdHex ?? "",
        flashManufacturerId: board.flashManufacturerId,
        flashManufacturerIdHex: board.flashManufacturerIdHex ?? "",
        flashManufacturerName: board.flashManufacturerName ?? "",
        flashDeviceId: board.flashDeviceId,
        flashDeviceIdHex: board.flashDeviceIdHex ?? "",
        psramSizeBytes: board.psramSizeBytes,
        psramDetected: board.psramDetected,
        crystalFrequency: board.crystalFrequency ?? "",
        securityFlags: board.securityFlags,
        securityFlagsHex: board.securityFlagsHex ?? "",
        flashCryptCnt: board.flashCryptCnt,
        flashCryptCntHex: board.flashCryptCntHex ?? "",
        securityKeyPurposes: formatNumberArray(board.securityKeyPurposes),
        securityChipId: board.securityChipId,
        securityApiVersion: board.securityApiVersion,
        secureBootEnabled: board.secureBootEnabled,
        flashEncryptionEnabled: board.flashEncryptionEnabled,
        bootloaderOffset: board.bootloaderOffset,
        bootloaderOffsetHex: board.bootloaderOffsetHex ?? "",
        boardType: board.boardType ?? "",
        manufacturer: board.manufacturer ?? "",
        purchaseUrl: board.purchaseUrl ?? "",
        physicalLocation: board.physicalLocation ?? "",
        projectId: board.projectId ?? "",
        lastConnectedAt: board.lastConnectedAt ?? "",
        notes: board.notes ?? ""
      }
    : emptyForm();

  Object.assign(form, next);
}

function close(): void {
  emit("update:modelValue", false);
}

function save(): void {
  const input: CreateBoardInput = {
    name: form.name,
    description: form.description,
    status: form.status,
    chipModel: form.chipModel,
    chipRevision: normalizeNumber(form.chipRevision),
    chipVariant: form.chipVariant,
    chipFamily: normalizeNumber(form.chipFamily),
    chipFamilyHex: form.chipFamilyHex,
    macAddress: form.macAddress,
    flashSizeBytes: normalizeNumber(form.flashSizeBytes),
    flashSizeLabel: form.flashSizeLabel,
    flashChipId: normalizeNumber(form.flashChipId),
    flashChipIdHex: form.flashChipIdHex,
    flashManufacturerId: normalizeNumber(form.flashManufacturerId),
    flashManufacturerIdHex: form.flashManufacturerIdHex,
    flashManufacturerName: form.flashManufacturerName,
    flashDeviceId: normalizeNumber(form.flashDeviceId),
    flashDeviceIdHex: form.flashDeviceIdHex,
    psramSizeBytes: normalizeNumber(form.psramSizeBytes),
    psramDetected: form.psramDetected,
    crystalFrequency: form.crystalFrequency,
    securityFlags: normalizeNumber(form.securityFlags),
    securityFlagsHex: form.securityFlagsHex,
    flashCryptCnt: normalizeNumber(form.flashCryptCnt),
    flashCryptCntHex: form.flashCryptCntHex,
    securityKeyPurposes: normalizeNumberArray(form.securityKeyPurposes),
    securityChipId: normalizeNumber(form.securityChipId),
    securityApiVersion: normalizeNumber(form.securityApiVersion),
    secureBootEnabled: form.secureBootEnabled,
    flashEncryptionEnabled: form.flashEncryptionEnabled,
    bootloaderOffset: normalizeNumber(form.bootloaderOffset),
    bootloaderOffsetHex: form.bootloaderOffsetHex,
    boardType: form.boardType,
    manufacturer: form.manufacturer,
    purchaseUrl: form.purchaseUrl,
    physicalLocation: form.physicalLocation,
    projectId: form.projectId,
    lastConnectedAt: form.lastConnectedAt,
    notes: form.notes
  };

  emit("save", input);
}

function normalizeNumber(value: OptionalNumericField): number | null {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeNumberArray(value: string): number[] | null {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return null;
  }

  const numbers = parts.map(Number);
  return numbers.every(Number.isFinite) ? numbers.map(Math.trunc) : null;
}

function formatNumberArray(value: number[] | null): string {
  return value?.join(", ") ?? "";
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="980"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>{{ title }}</span>
        <v-btn icon="mdi-close" variant="text" aria-label="Close" @click="close" />
      </v-card-title>

      <v-divider />

      <v-card-text>
        <v-form @submit.prevent="save">
          <v-row>
            <v-col cols="12" md="8">
              <v-text-field
                v-model="form.name"
                label="Board name"
                required
                autofocus
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="form.status"
                :items="statusOptions"
                label="Status"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="form.projectId"
                :items="projectOptions"
                label="Project"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="form.description"
                label="Description"
                rows="2"
                auto-grow
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.chipModel" label="Chip model" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.macAddress" label="MAC address" />
            </v-col>

            <template v-if="isEditing">
              <v-col cols="12">
                <v-divider class="my-2" />
                <div class="section-title">Detected chip</div>
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="form.chipRevision"
                  label="Chip revision"
                  type="number"
                  min="0"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field v-model="form.chipVariant" label="Chip variant" />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="form.chipFamily"
                  label="Chip family constant"
                  type="number"
                  min="0"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field v-model="form.chipFamilyHex" label="Chip family hex" />
              </v-col>
            </template>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.flashSizeBytes"
                label="Flash size bytes"
                type="number"
                min="0"
              />
            </v-col>
            <template v-if="isEditing">
              <v-col cols="12" md="6">
                <v-text-field v-model="form.flashSizeLabel" label="Flash size label" />
              </v-col>
              <v-col cols="12">
                <div class="section-title">Flash chip</div>
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="form.flashChipId"
                  label="Flash chip ID"
                  type="number"
                  min="0"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field v-model="form.flashChipIdHex" label="Flash chip ID hex" />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="form.flashManufacturerId"
                  label="Flash manufacturer ID"
                  type="number"
                  min="0"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="form.flashManufacturerIdHex"
                  label="Flash manufacturer hex"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="form.flashManufacturerName"
                  label="Flash manufacturer"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="form.flashDeviceId"
                  label="Flash device ID"
                  type="number"
                  min="0"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="form.flashDeviceIdHex" label="Flash device ID hex" />
              </v-col>
            </template>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.psramSizeBytes"
                label="PSRAM size bytes"
                type="number"
                min="0"
              />
            </v-col>
            <v-col v-if="isEditing" cols="12" md="6">
              <v-select
                v-model="form.psramDetected"
                :items="booleanOptions"
                label="PSRAM detected"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="form.crystalFrequency"
                label="Crystal frequency"
              />
            </v-col>
            <template v-if="isEditing">
              <v-col cols="12">
                <div class="section-title">Security</div>
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="form.secureBootEnabled"
                  :items="booleanOptions"
                  label="Secure boot"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="form.flashEncryptionEnabled"
                  :items="booleanOptions"
                  label="Flash encryption"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="form.securityApiVersion"
                  label="Security API version"
                  type="number"
                  min="0"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="form.securityFlags"
                  label="Security flags"
                  type="number"
                  min="0"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field v-model="form.securityFlagsHex" label="Security flags hex" />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="form.flashCryptCnt"
                  label="Flash crypt count"
                  type="number"
                  min="0"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="form.flashCryptCntHex"
                  label="Flash crypt count hex"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.securityKeyPurposes"
                  label="Security key purposes"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.securityChipId"
                  label="Security chip ID"
                  type="number"
                  min="0"
                />
              </v-col>
              <v-col cols="12">
                <div class="section-title">Bootloader</div>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.bootloaderOffset"
                  label="Bootloader offset"
                  type="number"
                  min="0"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.bootloaderOffsetHex"
                  label="Bootloader offset hex"
                />
              </v-col>
            </template>

            <v-col cols="12" md="4">
              <v-text-field v-model="form.boardType" label="Board type" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="form.manufacturer" label="Manufacturer" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.physicalLocation" label="Location" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.purchaseUrl" label="Purchase URL" />
            </v-col>
            <template v-if="isEditing">
              <v-col cols="12">
                <div class="section-title">Record</div>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.lastConnectedAt" label="Last connected at" />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field :model-value="recordId" label="Board ID" readonly />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field :model-value="createdAt" label="Created" readonly />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field :model-value="updatedAt" label="Updated" readonly />
              </v-col>
            </template>

            <v-col cols="12">
              <v-textarea v-model="form.notes" label="Notes" rows="4" auto-grow />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" prepend-icon="mdi-content-save" @click="save">
          Save board
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.section-title {
  color: rgb(var(--v-theme-secondary));
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
