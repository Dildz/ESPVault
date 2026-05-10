<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import {
  BOARD_STATUSES,
  type Board,
  type BoardStatus,
  type CreateBoardInput
} from "../../shared/types/board";
import { BOARD_STATUS_LABELS } from "../utils/boardDisplay";

type OptionalNumericField = number | "" | null;

interface BoardForm {
  name: string;
  description: string;
  status: BoardStatus;
  chipModel: string;
  macAddress: string;
  flashSizeBytes: OptionalNumericField;
  psramSizeBytes: OptionalNumericField;
  crystalFrequency: string;
  boardType: string;
  manufacturer: string;
  purchaseUrl: string;
  physicalLocation: string;
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
const isEditing = computed(() => Boolean(props.board));
const title = computed(() => (isEditing.value ? "Edit board" : "Add board"));
const statusOptions = BOARD_STATUSES.map((status) => ({
  title: BOARD_STATUS_LABELS[status],
  value: status
}));

watch(
  () => [props.modelValue, props.board] as const,
  () => {
    if (props.modelValue) {
      resetForm(props.board);
    }
  },
  { immediate: true }
);

function emptyForm(): BoardForm {
  return {
    name: "",
    description: "",
    status: "available",
    chipModel: "",
    macAddress: "",
    flashSizeBytes: null,
    psramSizeBytes: null,
    crystalFrequency: "",
    boardType: "",
    manufacturer: "",
    purchaseUrl: "",
    physicalLocation: "",
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
        macAddress: board.macAddress ?? "",
        flashSizeBytes: board.flashSizeBytes,
        psramSizeBytes: board.psramSizeBytes,
        crystalFrequency: board.crystalFrequency ?? "",
        boardType: board.boardType ?? "",
        manufacturer: board.manufacturer ?? "",
        purchaseUrl: board.purchaseUrl ?? "",
        physicalLocation: board.physicalLocation ?? "",
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
    macAddress: form.macAddress,
    flashSizeBytes: normalizeNumber(form.flashSizeBytes),
    psramSizeBytes: normalizeNumber(form.psramSizeBytes),
    crystalFrequency: form.crystalFrequency,
    boardType: form.boardType,
    manufacturer: form.manufacturer,
    purchaseUrl: form.purchaseUrl,
    physicalLocation: form.physicalLocation,
    notes: form.notes
  };

  emit("save", input);
}

function normalizeNumber(value: OptionalNumericField): number | null {
  if (value === "" || value === null) {
    return null;
  }

  return Number(value);
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="820"
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
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.flashSizeBytes"
                label="Flash size bytes"
                type="number"
                min="0"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.psramSizeBytes"
                label="PSRAM size bytes"
                type="number"
                min="0"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="form.crystalFrequency"
                label="Crystal frequency"
              />
            </v-col>
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

