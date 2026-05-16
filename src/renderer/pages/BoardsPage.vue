<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import {
  BOARD_STATUSES,
  type Board,
  type BoardStatus,
  type CreateBoardInput
} from "../../shared/types/board";
import BoardEditorDialog from "../components/BoardEditorDialog.vue";
import { useBoardStore } from "../stores/boardStore";
import {
  BOARD_STATUS_COLORS,
  BOARD_STATUS_LABELS,
  formatFlashSize,
  formatDate,
  formatPsramSize
} from "../utils/boardDisplay";

interface BoardFilters {
  search: string;
  status: BoardStatus | "all";
  chipModel: string;
}

const boardStore = useBoardStore();
const { boards, chipModels, error, loading } = storeToRefs(boardStore);
const props = defineProps<{
  openBoardId?: string | null;
}>();
const editorOpen = ref(false);
const editingBoard = ref<Board | null>(null);
const deletingBoard = ref<Board | null>(null);
const saving = ref(false);
const openedBoardId = ref<string | null>(null);

const filters = reactive<BoardFilters>({
  search: "",
  status: "all",
  chipModel: ""
});

const statusOptions = [
  { title: "All statuses", value: "all" },
  ...BOARD_STATUSES.map((status) => ({
    title: BOARD_STATUS_LABELS[status],
    value: status
  }))
];

const chipModelOptions = computed(() => [
  { title: "All chip models", value: "" },
  ...chipModels.value.map((model) => ({ title: model, value: model }))
]);

const filteredBoards = computed(() => {
  const search = filters.search.trim().toLowerCase();

  return boards.value.filter((board) => {
    const matchesSearch =
      !search ||
      [
        board.name,
        board.description,
        board.chipModel,
        board.macAddress,
        board.physicalLocation,
        board.notes
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(search));

    const matchesStatus =
      filters.status === "all" || board.status === filters.status;
    const matchesChipModel =
      !filters.chipModel || board.chipModel === filters.chipModel;

    return matchesSearch && matchesStatus && matchesChipModel;
  });
});

onMounted(() => {
  void boardStore.loadBoards();
});

watch(
  () => props.openBoardId,
  () => {
    openedBoardId.value = null;
    openBoardFromProp();
  },
  { immediate: true }
);

watch(boards, () => {
  openBoardFromProp();
});

function openCreateDialog(): void {
  editingBoard.value = null;
  editorOpen.value = true;
}

function openEditDialog(board: Board): void {
  editingBoard.value = board;
  editorOpen.value = true;
}

function openBoardFromProp(): void {
  if (!props.openBoardId || props.openBoardId === openedBoardId.value) {
    return;
  }

  const board = boards.value.find((candidate) => candidate.id === props.openBoardId);
  if (!board) {
    return;
  }

  openEditDialog(board);
  openedBoardId.value = props.openBoardId;
}

async function saveBoard(input: CreateBoardInput): Promise<void> {
  saving.value = true;

  try {
    if (editingBoard.value) {
      await boardStore.updateBoard(editingBoard.value.id, input);
    } else {
      await boardStore.createBoard(input);
    }

    editorOpen.value = false;
    editingBoard.value = null;
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(): Promise<void> {
  if (!deletingBoard.value) {
    return;
  }

  await boardStore.deleteBoard(deletingBoard.value.id);
  deletingBoard.value = null;
}
</script>

<template>
  <section class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">Boards</h1>
        <p class="page-subtitle">
          Create and maintain the ESP32 boards stored in this local vault.
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
        Add board
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <div class="toolbar-band">
      <v-text-field
        v-model="filters.search"
        clearable
        hide-details
        label="Search"
        prepend-inner-icon="mdi-magnify"
      />
      <v-select
        v-model="filters.status"
        hide-details
        :items="statusOptions"
        label="Status"
      />
      <v-select
        v-model="filters.chipModel"
        hide-details
        :items="chipModelOptions"
        label="Chip model"
      />
      <v-btn
        variant="outlined"
        prepend-icon="mdi-refresh"
        :loading="loading"
        @click="boardStore.loadBoards"
      >
        Refresh
      </v-btn>
    </div>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-3" />

    <div v-if="!filteredBoards.length && !loading" class="empty-state">
      <v-icon icon="mdi-developer-board" size="40" color="secondary" />
      <div class="text-subtitle-1 font-weight-bold mt-3">No boards yet.</div>
      <div class="text-body-2 muted mt-1">
        Add an ESP32 board manually to start building your inventory.
      </div>
      <v-btn class="mt-4" color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
        Add board
      </v-btn>
    </div>

    <v-card v-else flat border>
      <v-table>
        <thead>
          <tr>
            <th>Board</th>
            <th>Status</th>
            <th>Chip</th>
            <th>Flash</th>
            <th>PSRAM</th>
            <th>Location</th>
            <th>Updated</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="board in filteredBoards" :key="board.id">
            <td>
              <div class="board-name">{{ board.name }}</div>
              <div class="text-caption muted">
                {{ board.description || board.notes || "No notes yet" }}
              </div>
            </td>
            <td>
              <v-chip
                class="status-chip"
                :color="BOARD_STATUS_COLORS[board.status]"
                size="small"
                variant="tonal"
              >
                {{ BOARD_STATUS_LABELS[board.status] }}
              </v-chip>
            </td>
            <td>{{ board.chipModel || "Not set" }}</td>
            <td>{{ formatFlashSize(board.flashSizeBytes, board.flashSizeLabel) }}</td>
            <td>{{ formatPsramSize(board.psramSizeBytes, board.psramDetected) }}</td>
            <td>{{ board.physicalLocation || "Not set" }}</td>
            <td>{{ formatDate(board.updatedAt) }}</td>
            <td class="text-right">
              <v-btn
                icon="mdi-pencil"
                size="small"
                variant="text"
                aria-label="Edit board"
                @click="openEditDialog(board)"
              />
              <v-btn
                icon="mdi-delete-outline"
                size="small"
                variant="text"
                color="error"
                aria-label="Delete board"
                @click="deletingBoard = board"
              />
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <BoardEditorDialog
      v-model="editorOpen"
      :board="editingBoard"
      @save="saveBoard"
    />

    <v-dialog :model-value="Boolean(deletingBoard)" max-width="460" persistent>
      <v-card>
        <v-card-title>Delete board?</v-card-title>
        <v-card-text>
          This removes
          <strong>{{ deletingBoard?.name }}</strong>
          from the local inventory.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deletingBoard = null">Cancel</v-btn>
          <v-btn color="error" prepend-icon="mdi-delete-outline" @click="confirmDelete">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>
