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
const boardCoverError = ref<string | null>(null);
const boardCoverBusyId = ref<string | null>(null);
const boardThumbnailUrls = ref<Record<string, string | null>>({});
let boardThumbnailLoadToken = 0;

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

const boardCoverPathKey = computed(() =>
  boards.value
    .map((board) => `${board.id}:${board.coverImagePath ?? ""}`)
    .join("|")
);

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

watch(
  boardCoverPathKey,
  () => {
    void loadBoardCoverThumbnails(boards.value);
  },
  { immediate: true }
);

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

  const coverImagePath = deletingBoard.value.coverImagePath;
  await boardStore.deleteBoard(deletingBoard.value.id);

  if (coverImagePath) {
    await window.api.boardImages.deleteCover(coverImagePath).catch(() => {
      // The board record is gone. A stale old image file is non-blocking.
    });
  }

  deletingBoard.value = null;
}

async function loadBoardCoverThumbnails(boardList: Board[]): Promise<void> {
  const token = ++boardThumbnailLoadToken;
  const nextThumbnails: Record<string, string | null> = {};

  await Promise.all(
    boardList.map(async (board) => {
      if (!board.coverImagePath) {
        nextThumbnails[board.id] = null;
        return;
      }

      try {
        nextThumbnails[board.id] =
          await window.api.boardImages.readCoverDataUrl(board.coverImagePath);
      } catch {
        nextThumbnails[board.id] = null;
      }
    })
  );

  if (token === boardThumbnailLoadToken) {
    boardThumbnailUrls.value = nextThumbnails;
  }
}

async function chooseBoardCover(board: Board): Promise<void> {
  boardCoverError.value = null;
  boardCoverBusyId.value = board.id;

  const previousPath = board.coverImagePath;
  let copiedPath: string | null = null;

  try {
    const result = await window.api.boardImages.chooseCover(board.id);

    if (result.canceled || !result.localPath) {
      return;
    }

    copiedPath = result.localPath;
    const updatedBoard = await boardStore.updateBoard(board.id, {
      coverImagePath: result.localPath,
      coverImageFilename: result.filename ?? null,
      coverImageMimeType: result.mimeType ?? null,
      coverImageSizeBytes: result.sizeBytes ?? null
    });
    if (editingBoard.value?.id === updatedBoard.id) {
      editingBoard.value = updatedBoard;
    }
    boardThumbnailUrls.value = {
      ...boardThumbnailUrls.value,
      [board.id]:
        result.dataUrl ??
        (await window.api.boardImages.readCoverDataUrl(result.localPath))
    };

    if (previousPath && previousPath !== result.localPath) {
      await window.api.boardImages.deleteCover(previousPath).catch(() => {
        // The board now points at the new image. A stale old file is non-blocking.
      });
    }
  } catch (caughtError) {
    if (copiedPath) {
      await window.api.boardImages.deleteCover(copiedPath).catch(() => {
        // Cleanup failure should not hide the original save error.
      });
    }

    boardCoverError.value = getBoardCoverError(
      caughtError,
      "The board photo could not be saved."
    );
  } finally {
    boardCoverBusyId.value = null;
  }
}

async function removeBoardCover(board: Board): Promise<void> {
  if (!board.coverImagePath) {
    return;
  }

  const previousPath = board.coverImagePath;
  boardCoverError.value = null;
  boardCoverBusyId.value = board.id;

  try {
    const updatedBoard = await boardStore.updateBoard(board.id, {
      coverImagePath: null,
      coverImageFilename: null,
      coverImageMimeType: null,
      coverImageSizeBytes: null
    });
    if (editingBoard.value?.id === updatedBoard.id) {
      editingBoard.value = updatedBoard;
    }
    boardThumbnailUrls.value = {
      ...boardThumbnailUrls.value,
      [board.id]: null
    };

    try {
      await window.api.boardImages.deleteCover(previousPath);
    } catch (caughtError) {
      boardCoverError.value = getBoardCoverError(
        caughtError,
        "The board photo was removed from the board, but the file could not be deleted."
      );
    }
  } catch (caughtError) {
    boardCoverError.value = getBoardCoverError(
      caughtError,
      "The board photo could not be removed."
    );
  } finally {
    boardCoverBusyId.value = null;
  }
}

function getBoardCoverError(caughtError: unknown, fallback: string): string {
  return caughtError instanceof Error ? caughtError.message : fallback;
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
    <v-alert v-if="boardCoverError" type="error" variant="tonal" class="mb-4">
      {{ boardCoverError }}
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
            <th>MAC address</th>
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
              <div class="board-list-identity">
                <div class="board-list-cover" aria-hidden="true">
                  <img
                    v-if="boardThumbnailUrls[board.id]"
                    class="board-list-cover-image"
                    :src="boardThumbnailUrls[board.id] ?? ''"
                    alt=""
                  >
                  <v-icon
                    v-else
                    icon="mdi-image-outline"
                    size="24"
                    color="secondary"
                  />
                </div>
                <div class="board-list-copy">
                  <div class="board-name">{{ board.name }}</div>
                  <div class="text-caption muted">
                    {{ board.description || board.notes || "No notes yet" }}
                  </div>
                </div>
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
            <td class="metadata-mono">{{ board.macAddress || "Not set" }}</td>
            <td>{{ formatFlashSize(board.flashSizeBytes, board.flashSizeLabel) }}</td>
            <td>{{ formatPsramSize(board.psramSizeBytes, board.psramDetected) }}</td>
            <td>{{ board.physicalLocation || "Not set" }}</td>
            <td>{{ formatDate(board.updatedAt) }}</td>
            <td class="text-right">
              <v-tooltip
                :text="board.coverImagePath ? 'Change board photo' : 'Add board photo'"
              >
                <template #activator="{ props: tooltipProps }">
                  <v-btn
                    v-bind="tooltipProps"
                    :icon="board.coverImagePath ? 'mdi-image-edit-outline' : 'mdi-image-plus-outline'"
                    size="small"
                    variant="text"
                    :loading="boardCoverBusyId === board.id"
                    :aria-label="board.coverImagePath ? 'Change board photo' : 'Add board photo'"
                    @click="chooseBoardCover(board)"
                  />
                </template>
              </v-tooltip>
              <v-tooltip v-if="board.coverImagePath" text="Remove board photo">
                <template #activator="{ props: tooltipProps }">
                  <v-btn
                    v-bind="tooltipProps"
                    icon="mdi-image-remove-outline"
                    size="small"
                    variant="text"
                    color="error"
                    :disabled="boardCoverBusyId === board.id"
                    aria-label="Remove board photo"
                    @click="removeBoardCover(board)"
                  />
                </template>
              </v-tooltip>
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
      :cover-image-busy="Boolean(editingBoard && boardCoverBusyId === editingBoard.id)"
      :cover-image-error="boardCoverError"
      @choose-cover="chooseBoardCover"
      @remove-cover="removeBoardCover"
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

<style scoped>
.metadata-mono {
  font-family: "Cascadia Mono", "Segoe UI Mono", monospace;
  font-size: 0.8125rem;
  white-space: nowrap;
}

.board-list-identity {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.board-list-cover {
  display: grid;
  width: 52px;
  height: 52px;
  overflow: hidden;
  place-items: center;
  border: 1px solid #dcded8;
  border-radius: 8px;
  background: #f4f6f1;
}

.board-list-cover-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.board-list-copy {
  min-width: 0;
}
</style>
