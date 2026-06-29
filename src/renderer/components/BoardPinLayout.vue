<script setup lang="ts">
import { computed, ref } from "vue";
import type { PinAssignment } from "../../shared/types/inventory";
import type { PinoutPin } from "../utils/pinoutAssets";

const props = defineProps<{
  pins: PinoutPin[];
  imageUrl: string | null;
  assignments?: PinAssignment[];
  editable?: boolean;
}>();

const emit = defineEmits<{
  set: [gpio: string, label: string];
  clear: [gpio: string];
}>();

const vFocus = {
  mounted: (el: HTMLInputElement) => el.focus()
};

const assignmentByGpio = computed(() => {
  const map = new Map<string, PinAssignment>();
  for (const assignment of props.assignments ?? []) {
    map.set(assignment.gpio, assignment);
  }
  return map;
});

const editingGpio = ref<string | null>(null);
const draft = ref("");

function labelFor(pin: PinoutPin): string | null {
  return assignmentByGpio.value.get(String(pin.gpioid))?.label ?? null;
}

function startEdit(pin: PinoutPin): void {
  if (!props.editable) {
    return;
  }
  editingGpio.value = String(pin.gpioid);
  draft.value = labelFor(pin) ?? "";
}

function commitEdit(pin: PinoutPin): void {
  const gpio = String(pin.gpioid);
  const value = draft.value.trim();
  const current = labelFor(pin) ?? "";

  if (value !== current) {
    if (value) {
      emit("set", gpio, value);
    } else {
      emit("clear", gpio);
    }
  }
  editingGpio.value = null;
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
        <span class="pin-dot" :class="{ 'pin-dot--assigned': labelFor(pin) }" />
        <input
          v-if="editable && editingGpio === String(pin.gpioid)"
          v-model="draft"
          v-focus
          class="pin-input"
          :placeholder="`GPIO${pin.gpioid}`"
          @keyup.enter="commitEdit(pin)"
          @blur="commitEdit(pin)"
        >
        <span
          v-else
          class="pin-chip"
          :class="{
            'pin-chip--assigned': labelFor(pin),
            'pin-chip--editable': editable
          }"
          @click="startEdit(pin)"
        >
          <span class="pin-gpio">GPIO{{ pin.gpioid }}</span>
          <span v-if="labelFor(pin)" class="pin-name">{{ labelFor(pin) }}</span>
        </span>
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
  cursor: text;
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

.pin-input {
  width: 96px;
  padding: 1px 6px;
  font-size: 0.7rem;
  line-height: 1.4;
  border: 1px solid rgb(var(--v-theme-primary));
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  outline: none;
}
</style>
