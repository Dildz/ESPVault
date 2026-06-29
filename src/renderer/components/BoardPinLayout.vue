<script setup lang="ts">
import type { PinoutPin } from "../utils/pinoutAssets";

defineProps<{
  pins: PinoutPin[];
  imageUrl: string | null;
}>();
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
        <span class="pin-dot" />
        <span class="pin-chip">GPIO{{ pin.gpioid }}</span>
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
  background: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-surface), 0.9);
}

.pin-chip {
  padding: 1px 6px;
  font-size: 0.7rem;
  line-height: 1.4;
  white-space: nowrap;
  border: 1px solid var(--vault-border);
  border-radius: 6px;
  background: rgba(var(--v-theme-surface), 0.92);
  color: rgb(var(--v-theme-on-surface));
}
</style>
