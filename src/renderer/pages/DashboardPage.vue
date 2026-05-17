<script setup lang="ts">
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import type { Board } from "../../shared/types/board";
import { useBoardStore } from "../stores/boardStore";
import { useProjectStore } from "../stores/projectStore";
import {
  BOARD_STATUS_COLORS,
  BOARD_STATUS_ICONS,
  BOARD_STATUS_LABELS,
  formatBytes,
  formatDate
} from "../utils/boardDisplay";

const boardStore = useBoardStore();
const projectStore = useProjectStore();
const { boards, dashboardStats, error, loading } = storeToRefs(boardStore);
const { projects, loading: projectsLoading } = storeToRefs(projectStore);
const emit = defineEmits<{
  "open-boards": [];
  "open-backup": [];
  "scan-boards": [];
}>();
const totalBoards = computed(() => dashboardStats.value?.totalBoards ?? boards.value.length);
const availableBoards = computed(() => dashboardStats.value?.availableBoards ?? 0);
const inUseBoards = computed(() => dashboardStats.value?.inUseBoards ?? 0);
const brokenBoards = computed(() => dashboardStats.value?.brokenBoards ?? 0);
const totalFlashBytes = computed(() =>
  boards.value.reduce((total, board) => total + (board.flashSizeBytes ?? 0), 0)
);
const totalPsramBytes = computed(() =>
  boards.value.reduce((total, board) => total + (board.psramSizeBytes ?? 0), 0)
);
const boardsWithKnownFlash = computed(
  () => boards.value.filter((board) => board.flashSizeBytes !== null).length
);
const boardsWithKnownPsram = computed(
  () => boards.value.filter((board) => board.psramSizeBytes !== null).length
);
const boardsNeedingAttention = computed(
  () =>
    boards.value.filter((board) =>
      ["broken", "needs_flashing", "unknown"].includes(board.status)
    ).length
);
const unassignedBoards = computed(
  () => boards.value.filter((board) => !board.projectId).length
);
const chipFamilyMetrics = computed(() => {
  const counts = new Map<string, number>();

  for (const board of boards.value) {
    const chipFamily = formatChipFamily(board);
    counts.set(chipFamily, (counts.get(chipFamily) ?? 0) + 1);
  }

  return Array.from(counts, ([label, count]) => ({ label, count })).sort(
    (left, right) => right.count - left.count || left.label.localeCompare(right.label)
  );
});
const largestChipFamilyCount = computed(
  () => chipFamilyMetrics.value[0]?.count ?? 0
);
const dominantChipFamily = computed(() => chipFamilyMetrics.value[0]?.label ?? "No chip data");
const readinessPercent = computed(() => {
  if (totalBoards.value === 0) {
    return 0;
  }

  return Math.round(
    ((totalBoards.value - boardsNeedingAttention.value) / totalBoards.value) * 100
  );
});
const readinessLabel = computed(() => {
  if (totalBoards.value === 0) {
    return "Add inventory";
  }

  return boardsNeedingAttention.value > 0
    ? "Inventory needs review"
    : "Inventory healthy";
});
const readinessColor = computed(() =>
  totalBoards.value === 0 || boardsNeedingAttention.value > 0
    ? "warning"
    : "success"
);
const readinessStyle = computed(() => ({
  "--readiness": `${readinessPercent.value}%`
}));
const recentActivity = computed(() => {
  const activity = [
    ...(dashboardStats.value?.recentlyConnectedBoards ?? []).map((board) => ({
      board,
      kind: "Connection",
      label: "Connected",
      icon: "mdi-usb-port",
      color: "info",
      date: board.lastConnectedAt
    })),
    ...(dashboardStats.value?.recentlyUpdatedBoards ?? []).map((board) => ({
      board,
      kind: "Record update",
      label: "Updated",
      icon: "mdi-pencil-circle-outline",
      color: "primary",
      date: board.updatedAt
    }))
  ];

  return activity
    .sort(
      (left, right) =>
        new Date(right.date ?? 0).getTime() - new Date(left.date ?? 0).getTime()
    )
    .slice(0, 6);
});

onMounted(() => {
  void refreshDashboard();
});

async function refreshDashboard(): Promise<void> {
  await Promise.all([boardStore.refresh(), projectStore.loadProjects()]);
}

function formatRecordedCount(count: number): string {
  const total = boards.value.length;
  return total === 0 ? "No boards recorded" : `${count}/${total} boards recorded`;
}

function formatChipFamily(board: Board): string {
  return board.chipModel?.trim() || board.chipFamilyHex || "Unknown";
}

function chipFamilyPercent(count: number): number {
  return largestChipFamilyCount.value > 0
    ? Math.round((count / largestChipFamilyCount.value) * 100)
    : 0;
}
</script>

<template>
  <section class="page-shell dashboard-shell">
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <section class="dashboard-hero">
      <div class="dashboard-hero-copy">
        <div class="dashboard-eyebrow">
          <v-icon icon="mdi-chip" size="18" />
          Local ESP32 vault
        </div>
        <h1 class="dashboard-title">Your maker bench, organized.</h1>
        <p class="dashboard-subtitle">
          Track board readiness, memory, projects, and recent activity from one calm overview.
        </p>
        <div class="dashboard-actions">
          <v-btn
            color="primary"
            prepend-icon="mdi-usb-port"
            @click="emit('scan-boards')"
          >
            Scan boards
          </v-btn>
          <v-btn
            variant="outlined"
            prepend-icon="mdi-refresh"
            :loading="loading || projectsLoading"
            @click="refreshDashboard"
          >
            Refresh
          </v-btn>
        </div>
      </div>

      <div class="readiness-panel">
        <div class="readiness-ring" :style="readinessStyle">
          <div class="readiness-ring-inner">
            <div class="readiness-percent">{{ readinessPercent }}%</div>
            <div class="readiness-caption">Inventory health</div>
          </div>
        </div>
        <div class="readiness-copy">
          <v-chip
            :color="readinessColor"
            :prepend-icon="boardsNeedingAttention > 0 ? 'mdi-alert-outline' : 'mdi-check-circle-outline'"
            size="small"
            variant="tonal"
          >
            {{ readinessLabel }}
          </v-chip>
          <div class="readiness-summary">
            {{ boardsNeedingAttention }} board{{ boardsNeedingAttention === 1 ? "" : "s" }}
            need review out of {{ totalBoards }} tracked.
          </div>
        </div>
      </div>
    </section>

    <div class="dashboard-insights">
      <div class="insight-card insight-card--boards">
        <v-icon icon="mdi-developer-board" />
        <div>
          <div class="insight-value">{{ totalBoards }}</div>
          <div class="insight-label">Boards tracked</div>
        </div>
      </div>
      <div class="insight-card insight-card--projects">
        <v-icon icon="mdi-folder-multiple-outline" />
        <div>
          <div class="insight-value">{{ projects.length }}</div>
          <div class="insight-label">Projects</div>
        </div>
      </div>
      <div class="insight-card insight-card--available">
        <v-icon icon="mdi-check-circle-outline" />
        <div>
          <div class="insight-value">{{ availableBoards }}</div>
          <div class="insight-label">Available</div>
        </div>
      </div>
      <div class="insight-card insight-card--attention">
        <v-icon icon="mdi-alert-outline" />
        <div>
          <div class="insight-value">{{ boardsNeedingAttention }}</div>
          <div class="insight-label">Need attention</div>
        </div>
      </div>
    </div>

    <div class="dashboard-snapshot">
      <div class="snapshot-panel">
        <div class="metric-label">Known memory</div>
        <div class="snapshot-values">
          <div>
            <strong>{{ formatBytes(totalFlashBytes) }}</strong>
            <span>Flash recorded on {{ formatRecordedCount(boardsWithKnownFlash) }}</span>
          </div>
          <div>
            <strong>{{ formatBytes(totalPsramBytes) }}</strong>
            <span>PSRAM recorded on {{ formatRecordedCount(boardsWithKnownPsram) }}</span>
          </div>
        </div>
      </div>
      <div class="snapshot-panel">
        <div class="metric-label">Board state</div>
        <div class="status-pills">
          <v-chip color="success" prepend-icon="mdi-check-circle-outline" size="small" variant="tonal">
            {{ availableBoards }} available
          </v-chip>
          <v-chip color="info" prepend-icon="mdi-play-circle-outline" size="small" variant="tonal">
            {{ inUseBoards }} in use
          </v-chip>
          <v-chip color="error" prepend-icon="mdi-alert-octagon-outline" size="small" variant="tonal">
            {{ brokenBoards }} broken
          </v-chip>
        </div>
      </div>
      <div class="snapshot-panel">
        <div class="metric-label">Lab organization</div>
        <div class="snapshot-values">
          <div>
            <strong>{{ unassignedBoards }}</strong>
            <span>Unassigned board{{ unassignedBoards === 1 ? "" : "s" }}</span>
          </div>
          <div>
            <strong>{{ dominantChipFamily }}</strong>
            <span>Dominant chip family</span>
          </div>
        </div>
      </div>
    </div>

    <div class="dashboard-main-grid">
      <v-card class="panel-card dashboard-panel" flat>
          <v-card-title class="text-subtitle-1 font-weight-bold">
            <v-icon class="mr-2" color="primary" icon="mdi-chart-bar" />
            Boards by chip family
          </v-card-title>
          <v-divider />
          <v-list v-if="chipFamilyMetrics.length" density="compact">
            <v-list-item
              v-for="chipFamily in chipFamilyMetrics"
              :key="chipFamily.label"
            >
              <div class="chip-family-row">
                <div>
                  <div class="font-weight-medium">{{ chipFamily.label }}</div>
                  <div class="text-caption muted">
                    {{ chipFamily.count }} board{{ chipFamily.count === 1 ? "" : "s" }}
                  </div>
                </div>
                <v-progress-linear
                  class="chip-family-bar"
                  color="primary"
                  height="8"
                  rounded
                  :model-value="chipFamilyPercent(chipFamily.count)"
                />
              </div>
            </v-list-item>
          </v-list>
          <div v-else class="empty-state ma-4">
            <v-icon icon="mdi-chip" size="34" color="primary" />
            <div class="text-subtitle-1 font-weight-bold mt-2">No chip data yet.</div>
            <div class="text-body-2 muted mt-1">
              Scan boards to populate chip family counts.
            </div>
          </div>
      </v-card>

      <v-card class="panel-card dashboard-panel" flat>
          <v-card-title class="text-subtitle-1 font-weight-bold">
            <v-icon class="mr-2" color="primary" icon="mdi-history" />
            Recent activity
          </v-card-title>
          <v-divider />
          <v-list v-if="recentActivity.length" lines="two" class="activity-list">
            <v-list-item
              v-for="(activity, index) in recentActivity"
              :key="`${activity.kind}-${activity.board.id}-${index}`"
              :title="activity.board.name"
              :subtitle="formatDate(activity.date)"
            >
              <template #prepend>
                <div class="activity-event-icon">
                  <v-icon :color="activity.color" :icon="activity.icon" size="22" />
                </div>
              </template>
              <template #title>
                <div class="activity-title-row">
                  <span>{{ activity.board.name }}</span>
                  <v-chip :color="activity.color" size="x-small" variant="tonal">
                    {{ activity.label }}
                  </v-chip>
                </div>
              </template>
              <template #append>
                <v-chip
                  class="status-chip"
                  :color="BOARD_STATUS_COLORS[activity.board.status]"
                  :prepend-icon="BOARD_STATUS_ICONS[activity.board.status]"
                  size="small"
                  variant="tonal"
                >
                  {{ BOARD_STATUS_LABELS[activity.board.status] }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
          <div v-else class="empty-state ma-4">
            <v-icon icon="mdi-developer-board" size="34" color="primary" />
            <div class="text-subtitle-1 font-weight-bold mt-2">No boards yet.</div>
            <div class="text-body-2 muted mt-1">
              Add a board manually to start building your inventory.
            </div>
            <v-btn
              class="mt-4"
              color="primary"
              prepend-icon="mdi-plus"
              @click="emit('open-boards')"
            >
              Add board
            </v-btn>
          </div>
      </v-card>

      <v-card class="panel-card dashboard-panel quick-actions-card" flat>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          <v-icon class="mr-2" color="primary" icon="mdi-lightning-bolt-outline" />
          Quick actions
        </v-card-title>
        <v-divider />
        <v-card-text class="quick-actions-grid">
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            @click="emit('open-boards')"
          >
            Add board
          </v-btn>
          <v-btn
            variant="tonal"
            color="primary"
            prepend-icon="mdi-usb-port"
            @click="emit('scan-boards')"
          >
            Scan board
          </v-btn>
          <v-btn
            variant="outlined"
            prepend-icon="mdi-label-multiple-outline"
            disabled
          >
            Print labels
          </v-btn>
          <v-btn
            variant="outlined"
            prepend-icon="mdi-database-import-outline"
            @click="emit('open-backup')"
          >
            Import inventory
          </v-btn>
        </v-card-text>
      </v-card>
    </div>
  </section>
</template>

<style scoped>
.dashboard-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dashboard-hero {
  position: relative;
  display: grid;
  overflow: hidden;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  gap: 20px;
  align-items: stretch;
  border: 1px solid rgba(var(--v-theme-primary), 0.18);
  border-radius: 8px;
  padding: clamp(20px, 2.2vw, 28px);
  background:
    radial-gradient(circle at 14% 12%, rgba(var(--v-theme-primary), 0.26), transparent 30%),
    radial-gradient(circle at 82% 22%, rgba(var(--v-theme-accent), 0.22), transparent 28%),
    linear-gradient(135deg, rgba(var(--v-theme-surface), 0.98), rgba(var(--v-theme-surface-variant), 0.62));
  box-shadow: var(--vault-elevated-shadow);
}

.dashboard-hero::after {
  position: absolute;
  inset: auto 0 0;
  height: 3px;
  background: linear-gradient(90deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-accent)), rgb(var(--v-theme-info)));
  content: "";
}

.dashboard-hero-copy {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 190px;
}

.dashboard-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  border: 1px solid rgba(var(--v-theme-primary), 0.24);
  border-radius: 8px;
  padding: 7px 10px;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
}

.dashboard-title {
  max-width: 760px;
  margin: 14px 0 0;
  color: var(--vault-text);
  font-size: clamp(2rem, 3.1vw, 3.45rem);
  font-weight: 850;
  line-height: 0.98;
}

.dashboard-subtitle {
  max-width: 640px;
  margin: 12px 0 0;
  color: var(--vault-muted);
  font-size: 1rem;
  line-height: 1.55;
}

.dashboard-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.readiness-panel {
  position: relative;
  z-index: 1;
  display: grid;
  align-content: center;
  justify-items: center;
  border: 1px solid var(--vault-soft-border);
  border-radius: 8px;
  padding: 18px;
  background: rgba(var(--v-theme-background), 0.34);
}

.readiness-ring {
  display: grid;
  width: min(178px, 48vw);
  aspect-ratio: 1;
  place-items: center;
  border-radius: 50%;
  background:
    conic-gradient(rgb(var(--v-theme-primary)) var(--readiness), rgba(var(--v-theme-on-surface), 0.12) 0),
    rgba(var(--v-theme-surface), 0.5);
  box-shadow: inset 0 0 36px rgba(var(--v-theme-primary), 0.14);
}

.readiness-ring-inner {
  display: grid;
  width: 72%;
  aspect-ratio: 1;
  place-items: center;
  align-content: center;
  border: 1px solid var(--vault-soft-border);
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
}

.readiness-percent {
  color: var(--vault-text);
  font-size: 2.25rem;
  font-weight: 850;
  line-height: 1;
}

.readiness-caption {
  margin-top: 6px;
  color: var(--vault-muted);
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
}

.readiness-copy {
  display: grid;
  justify-items: center;
  gap: 10px;
  margin-top: 14px;
  text-align: center;
}

.readiness-summary {
  max-width: 280px;
  color: var(--vault-muted);
  line-height: 1.45;
}

.dashboard-insights {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.insight-card {
  --insight-rgb: var(--v-theme-primary);
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  overflow: hidden;
  border: 1px solid var(--vault-border);
  border-radius: 8px;
  padding: 16px;
  background:
    linear-gradient(135deg, rgba(var(--insight-rgb), 0.12), rgba(var(--v-theme-surface), 0.84)),
    rgb(var(--v-theme-surface));
  box-shadow: var(--vault-card-shadow);
}

.insight-card::before {
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: rgba(var(--insight-rgb), 0.78);
  content: "";
}

.insight-card :deep(.v-icon) {
  display: grid;
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid rgba(var(--insight-rgb), 0.24);
  border-radius: 8px;
  background: rgba(var(--insight-rgb), 0.12);
  color: rgb(var(--insight-rgb));
}

.insight-card--boards {
  --insight-rgb: var(--v-theme-primary);
}

.insight-card--projects {
  --insight-rgb: var(--v-theme-accent);
}

.insight-card--available {
  --insight-rgb: var(--v-theme-success);
}

.insight-card--attention {
  --insight-rgb: var(--v-theme-warning);
}

.insight-value {
  color: var(--vault-text);
  font-size: 1.75rem;
  font-weight: 850;
  line-height: 1;
}

.insight-label {
  margin-top: 5px;
  color: var(--vault-muted);
  font-size: 0.8rem;
  font-weight: 750;
  text-transform: uppercase;
}

.dashboard-snapshot {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 12px;
}

.snapshot-panel {
  border: 1px solid var(--vault-border);
  border-radius: 8px;
  padding: 18px;
  background: rgba(var(--v-theme-surface), 0.78);
}

.snapshot-values {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.snapshot-values div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
}

.snapshot-values strong {
  min-width: 0;
  color: var(--vault-text);
  font-size: 1.22rem;
  overflow-wrap: anywhere;
}

.snapshot-values span {
  color: var(--vault-muted);
  font-size: 0.85rem;
  text-align: right;
}

.status-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.dashboard-main-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.85fr) minmax(460px, 1.15fr) minmax(240px, 0.58fr);
  gap: 16px;
  align-items: start;
}

.dashboard-panel {
  min-height: 180px;
}

.chip-family-row {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(120px, 42%);
  gap: 12px;
  align-items: center;
  width: 100%;
}

.chip-family-bar {
  min-width: 0;
}

.activity-list :deep(.v-list-item) {
  min-height: 66px;
}

.activity-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.activity-title-row span {
  min-width: 0;
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-event-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid var(--vault-soft-border);
  border-radius: 8px;
  background: rgba(var(--v-theme-surface-variant), 0.32);
}

.quick-actions-card {
  min-height: 0;
}

.quick-actions-grid {
  display: grid;
  gap: 10px;
}

.quick-actions-grid :deep(.v-btn) {
  justify-content: flex-start;
}

@media (max-width: 720px) {
  .chip-family-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1180px) {
  .dashboard-hero,
  .dashboard-main-grid,
  .dashboard-snapshot {
    grid-template-columns: 1fr;
  }

  .dashboard-insights {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .dashboard-insights {
    grid-template-columns: 1fr;
  }

  .snapshot-values div {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
  }

  .snapshot-values span {
    text-align: left;
  }
}
</style>
