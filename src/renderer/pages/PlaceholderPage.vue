<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
}>();
</script>

<template>
  <section class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ title }}</h1>
        <p class="page-subtitle">{{ description }}</p>
      </div>
    </div>

    <div class="empty-state">
      <v-icon icon="mdi-hammer-wrench" size="36" color="secondary" />
      <div class="text-subtitle-1 font-weight-bold mt-3">Not wired yet</div>
      <div class="text-body-2 muted mt-1">
        The first vertical slice keeps this area intentionally small.
      </div>
    </div>
  </section>
</template>

