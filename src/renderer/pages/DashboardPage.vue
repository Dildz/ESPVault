<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { ArcElement, Chart, DoughnutController, Tooltip } from "chart.js";
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

Chart.register(ArcElement, DoughnutController, Tooltip);

const boardStore = useBoardStore();
const projectStore = useProjectStore();
const { boards, dashboardStats, error } = storeToRefs(boardStore);
const { projects } = storeToRefs(projectStore);
const emit = defineEmits<{
  "open-boards": [];
}>();
const chipFamilyChartCanvas = ref<HTMLCanvasElement | null>(null);
let chipFamilyChart: Chart<"doughnut"> | null = null;

const chipFamilyPalette = [
  "#2dd4bf",
  "#22c55e",
  "#38bdf8",
  "#a78bfa",
  "#f59e0b",
  "#fb7185",
  "#84cc16"
];

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
const chipFamilyChartMetrics = computed(() => chipFamilyMetrics.value.slice(0, 7));
const dominantChipFamily = computed(() => chipFamilyMetrics.value[0]?.label ?? "No chip data");
const chipFamilyCount = computed(() => chipFamilyMetrics.value.length);
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
  void nextTick(renderChipFamilyChart);
});

onBeforeUnmount(() => {
  chipFamilyChart?.destroy();
  chipFamilyChart = null;
});

watch(
  chipFamilyChartMetrics,
  () => {
    void nextTick(renderChipFamilyChart);
  },
  { deep: true }
);

function renderChipFamilyChart(): void {
  const canvas = chipFamilyChartCanvas.value;
  const metrics = chipFamilyChartMetrics.value;

  chipFamilyChart?.destroy();
  chipFamilyChart = null;

  if (!canvas || !metrics.length) {
    return;
  }

  chipFamilyChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: metrics.map((metric) => metric.label),
      datasets: [
        {
          data: metrics.map((metric) => metric.count),
          backgroundColor: metrics.map(
            (_metric, index) => chipFamilyPalette[index % chipFamilyPalette.length]
          ),
          borderColor: "rgba(7, 18, 17, 0.94)",
          borderRadius: 3,
          borderWidth: 4,
          spacing: 2,
          hoverBorderColor: "rgba(255, 255, 255, 0.78)",
          hoverOffset: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "66%",
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: "rgba(2, 6, 23, 0.92)",
          borderColor: "rgba(45, 212, 191, 0.35)",
          borderWidth: 1,
          displayColors: true,
          callbacks: {
            label: (context) => {
              const label = context.label || "Unknown";
              const value = Number(context.parsed) || 0;
              return `${label}: ${value} board${value === 1 ? "" : "s"}`;
            }
          }
        }
      }
    }
  });
}

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

function chipFamilyColor(index: number): string {
  return chipFamilyPalette[index % chipFamilyPalette.length];
}
</script>

<template>
  <section class="page-shell dashboard-shell">
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

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
          <div class="memory-row">
            <div>
              <strong>{{ formatBytes(totalFlashBytes) }}</strong>
              <span class="memory-type">Flash memory</span>
            </div>
            <span>{{ formatRecordedCount(boardsWithKnownFlash) }}</span>
          </div>
          <div class="memory-row">
            <div>
              <strong>{{ formatBytes(totalPsramBytes) }}</strong>
              <span class="memory-type">PSRAM memory</span>
            </div>
            <span>{{ formatRecordedCount(boardsWithKnownPsram) }}</span>
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
      <v-card class="panel-card dashboard-panel chip-family-panel" flat>
          <v-card-title class="text-subtitle-1 font-weight-bold chip-family-title">
            <v-icon class="mr-2" color="primary" icon="mdi-chart-donut" />
            Boards by chip family
          </v-card-title>
          <v-divider />
          <div v-if="chipFamilyMetrics.length" class="chip-family-chart-card">
            <div class="chip-family-chart-wrap">
              <canvas ref="chipFamilyChartCanvas" aria-label="Boards by chip family chart" />
              <div class="chip-family-chart-center">
                <strong>{{ totalBoards }}</strong>
                <span>Total</span>
              </div>
            </div>

            <div class="chip-family-chart-content">
              <div class="chip-family-summary-row">
                <div>
                  <div class="metric-label">Chip mix</div>
                  <div class="chip-family-summary">
                    {{ chipFamilyCount }} famil{{ chipFamilyCount === 1 ? "y" : "ies" }}
                  </div>
                </div>
                <v-chip color="primary" size="small" variant="tonal">
                  {{ dominantChipFamily }}
                </v-chip>
              </div>

              <div class="chip-family-legend">
                <div
                  v-for="(chipFamily, index) in chipFamilyChartMetrics"
                  :key="chipFamily.label"
                  class="chip-family-legend-item"
                >
                  <span
                    class="chip-family-dot"
                    :style="{ backgroundColor: chipFamilyColor(index) }"
                  />
                  <div class="chip-family-legend-copy">
                    <span>{{ chipFamily.label }}</span>
                    <small>{{ chipFamily.count }} board{{ chipFamily.count === 1 ? "" : "s" }}</small>
                  </div>
                  <strong>{{ chipFamily.count }}</strong>
                </div>
              </div>
            </div>
          </div>
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
    </div>
  </section>
</template>

<style scoped>
.dashboard-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.snapshot-values .memory-row {
  align-items: flex-start;
}

.memory-row > div {
  display: grid;
  gap: 4px;
}

.snapshot-values strong {
  min-width: 0;
  color: var(--vault-text);
  font-size: 1.22rem;
  overflow-wrap: anywhere;
}

.memory-type {
  color: var(--vault-muted);
  font-size: 0.82rem;
  font-weight: 750;
  text-transform: uppercase;
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
  grid-template-columns: minmax(360px, 0.85fr) minmax(520px, 1.15fr);
  gap: 16px;
  align-items: start;
}

.dashboard-panel {
  min-height: 180px;
}

.chip-family-panel {
  overflow: hidden;
}

.chip-family-title {
  background:
    radial-gradient(circle at 12% 12%, rgba(var(--v-theme-primary), 0.16), transparent 34%),
    rgba(var(--v-theme-surface), 0.38);
}

.chip-family-chart-card {
  display: grid;
  grid-template-columns: minmax(160px, 220px) minmax(0, 1fr);
  gap: 20px;
  align-items: center;
  padding: 20px;
  background:
    radial-gradient(circle at 28% 42%, rgba(var(--v-theme-primary), 0.16), transparent 34%),
    radial-gradient(circle at 84% 12%, rgba(var(--v-theme-accent), 0.1), transparent 28%),
    linear-gradient(135deg, rgba(var(--v-theme-surface), 0.76), rgba(var(--v-theme-background), 0.18));
}

.chip-family-chart-wrap {
  position: relative;
  width: min(210px, 52vw);
  aspect-ratio: 1;
  justify-self: center;
}

.chip-family-chart-wrap canvas {
  position: relative;
  z-index: 2;
  width: 100% !important;
  height: 100% !important;
}

.chip-family-chart-wrap::before {
  position: absolute;
  inset: 10%;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(var(--v-theme-primary), 0.12), transparent 62%);
  box-shadow: 0 0 42px rgba(var(--v-theme-primary), 0.16);
  content: "";
}

.chip-family-chart-center {
  position: absolute;
  z-index: 1;
  inset: 29%;
  display: grid;
  place-items: center;
  align-content: center;
  border: 1px solid rgba(var(--v-theme-primary), 0.18);
  border-radius: 999px;
  background:
    linear-gradient(145deg, rgba(var(--v-theme-surface), 0.96), rgba(var(--v-theme-background), 0.78));
  box-shadow: inset 0 0 24px rgba(var(--v-theme-primary), 0.1);
  pointer-events: none;
}

.chip-family-chart-center strong {
  color: var(--vault-text);
  font-size: 1.55rem;
  font-weight: 850;
  line-height: 1;
}

.chip-family-chart-center span {
  margin-top: 4px;
  color: var(--vault-muted);
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
}

.chip-family-chart-content {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.chip-family-summary-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.chip-family-summary {
  margin-top: 4px;
  color: var(--vault-text);
  font-size: 1.1rem;
  font-weight: 800;
}

.chip-family-legend {
  display: grid;
  gap: 9px;
}

.chip-family-legend-item {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-width: 0;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
  padding: 8px 10px;
  background: rgba(var(--v-theme-surface), 0.4);
}

.chip-family-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  box-shadow: 0 0 0 4px rgba(var(--v-theme-primary), 0.08);
}

.chip-family-legend-copy {
  display: grid;
  min-width: 0;
}

.chip-family-legend-copy span {
  min-width: 0;
  overflow: hidden;
  color: var(--vault-text);
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-family-legend-copy small {
  color: var(--vault-muted);
  font-size: 0.75rem;
}

.chip-family-legend-item strong {
  color: var(--vault-text);
  font-weight: 850;
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

@media (max-width: 720px) {
  .chip-family-chart-card {
    grid-template-columns: 1fr;
  }

  .chip-family-summary-row {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 1180px) {
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
