<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import type { PinAssignment } from "../../shared/types/inventory";
import type { PinoutPin } from "../utils/pinoutAssets";

const props = defineProps<{
  pins: PinoutPin[];
  imageUrl: string | null;
  assignments?: PinAssignment[];
  editable?: boolean;
}>();

const emit = defineEmits<{
  // An empty draft (all fields blank) means "remove this assignment".
  set: [gpio: string, value: { label: string; function: string; notes: string }];
}>();

// Component presets borrowed from GPIO Viewer issue #102 (LED, sensor, cable…);
// v-combobox still lets you type anything else.
const FUNCTION_PRESETS = [
  "LED",
  "RGB LED",
  "Button",
  "Sensor",
  "Cable",
  "Power +",
  "Power −"
];

const assignmentByGpio = computed(() => {
  const map = new Map<string, PinAssignment>();
  for (const assignment of props.assignments ?? []) {
    map.set(assignment.gpio, assignment);
  }
  return map;
});

const editingGpio = ref<string | null>(null);
const draft = reactive({ label: "", function: "", notes: "" });
let original = "";

function assignmentFor(pin: PinoutPin): PinAssignment | undefined {
  return assignmentByGpio.value.get(String(pin.gpioid));
}

function displayName(pin: PinoutPin): string | null {
  const assignment = assignmentFor(pin);
  return assignment?.label || assignment?.function || null;
}

function isAssigned(pin: PinoutPin): boolean {
  const assignment = assignmentFor(pin);
  return Boolean(
    assignment?.label || assignment?.function || assignment?.notes
  );
}

function hasDetail(pin: PinoutPin): boolean {
  const assignment = assignmentFor(pin);
  return Boolean(assignment?.notes || assignment?.function);
}

function snapshot(): string {
  return JSON.stringify({
    label: draft.label,
    function: draft.function,
    notes: draft.notes
  });
}

function openEdit(pin: PinoutPin): void {
  const assignment = assignmentFor(pin);
  draft.label = assignment?.label ?? "";
  draft.function = assignment?.function ?? "";
  draft.notes = assignment?.notes ?? "";
  original = snapshot();
  editingGpio.value = String(pin.gpioid);
}

function commitAndClose(): void {
  const gpio = editingGpio.value;
  if (!gpio) {
    return;
  }
  if (snapshot() !== original) {
    emit("set", gpio, {
      label: draft.label,
      function: draft.function,
      notes: draft.notes
    });
  }
  editingGpio.value = null;
}

function onMenuToggle(pin: PinoutPin, open: boolean): void {
  if (open) {
    openEdit(pin);
  } else {
    commitAndClose();
  }
}

function clearAndClose(): void {
  draft.label = "";
  draft.function = "";
  draft.notes = "";
  commitAndClose();
}
</script>

<template>
  <div class="pin-layout">
    <div v-if="!imageUrl" class="pin-layout-missing text-caption muted">
      No board image available for this layout.
    </div>
    <div v-else class="pin-layout-stage">
      <img class="pin-layout-image" :src="imageUrl" alt="Board pinout">
      <div
        v-for="pin in pins"
        :key="pin.gpioid"
        class="pin-marker"
        :class="
          pin.valueJustify === 0 ? 'pin-marker--right' : 'pin-marker--left'
        "
        :style="{ top: `${pin.top}%`, left: `${pin.left}%` }"
      >
        <span
          class="pin-dot"
          :class="{ 'pin-dot--assigned': isAssigned(pin) }"
        />
        <v-menu
          :model-value="editingGpio === String(pin.gpioid)"
          :disabled="!editable"
          :close-on-content-click="false"
          location="bottom"
          @update:model-value="(open) => onMenuToggle(pin, open)"
        >
          <template #activator="{ props: menuProps }">
            <span
              v-bind="menuProps"
              class="pin-chip"
              :class="{
                'pin-chip--assigned': isAssigned(pin),
                'pin-chip--editable': editable
              }"
              :title="assignmentFor(pin)?.notes ?? undefined"
            >
              <span class="pin-gpio">GPIO{{ pin.gpioid }}</span>
              <span v-if="displayName(pin)" class="pin-name">
                {{ displayName(pin) }}
              </span>
              <span v-if="hasDetail(pin)" class="pin-detail-dot">•</span>
            </span>
          </template>
          <v-card class="pin-edit" min-width="280">
            <div class="pin-edit-title text-caption muted">
              GPIO{{ pin.gpioid }}
            </div>
            <v-text-field
              v-model="draft.label"
              label="Label"
              placeholder="e.g. SCL, relay 1"
              density="compact"
              variant="outlined"
              hide-details
              autofocus
              @keyup.enter="commitAndClose"
            />
            <v-combobox
              v-model="draft.function"
              :items="FUNCTION_PRESETS"
              label="Function"
              density="compact"
              variant="outlined"
              hide-details
            />
            <v-textarea
              v-model="draft.notes"
              label="Notes"
              rows="2"
              auto-grow
              density="compact"
              variant="outlined"
              hide-details
            />
            <div class="pin-edit-actions">
              <v-btn size="small" variant="text" @click="clearAndClose">
                Clear
              </v-btn>
              <v-btn size="small" color="primary" @click="commitAndClose">
                Done
              </v-btn>
            </div>
          </v-card>
        </v-menu>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pin-layout {
  display: flex;
  justify-content: center;
  /* Edge pins sit at ~4%/96%, so their labels point outward past the image —
     leave horizontal room for them. */
  padding: 0 64px;
}

.pin-layout-stage {
  position: relative;
  display: inline-block;
  max-width: 100%;
}

.pin-layout-image {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.pin-marker {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 4px;
}

.pin-marker--right {
  transform: translate(0, -50%);
}

.pin-marker--left {
  flex-direction: row-reverse;
  transform: translate(-100%, -50%);
}

.pin-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(var(--v-theme-on-surface), 0.4);
  box-shadow: 0 0 0 2px rgba(var(--v-theme-surface), 0.9);
}

.pin-dot--assigned {
  background: rgb(var(--v-theme-primary));
}

.pin-chip {
  display: flex;
  gap: 4px;
  align-items: baseline;
  padding: 1px 6px;
  font-size: 0.7rem;
  line-height: 1.4;
  white-space: nowrap;
  border: 1px solid var(--vault-border);
  border-radius: 6px;
  background: rgba(var(--v-theme-surface), 0.92);
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.pin-chip--editable {
  cursor: pointer;
}

.pin-chip--assigned {
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-surface));
}

.pin-gpio {
  font-weight: 600;
}

.pin-name {
  color: rgb(var(--v-theme-primary));
}

.pin-detail-dot {
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
}

.pin-edit {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.pin-edit-title {
  font-weight: 600;
}

.pin-edit-actions {
  display: flex;
  justify-content: space-between;
}
</style>
