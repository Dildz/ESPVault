import { ref } from "vue";
import type { UpdateCapability } from "../../shared/types/api";
import {
  loadAutoUpdateOnStartup,
  loadSkippedUpdateVersion,
  saveSkippedUpdateVersion
} from "../services/appUpdateSettings";

type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "uptodate"
  | "error";

const capability = ref<UpdateCapability | null>(null);
const status = ref<UpdateStatus>("idle");
const availableVersion = ref<string | null>(null);
const progressPercent = ref(0);
const errorMessage = ref<string | null>(null);
const dialogOpen = ref(false);
const resultSnackbar = ref(false);
const resultMessage = ref("");

let progressUnsubscribe: (() => void) | null = null;

async function initUpdater(): Promise<void> {
  try {
    capability.value = await window.api.updater.getCapability();
  } catch {
    capability.value = null;
  }

  if (!progressUnsubscribe) {
    progressUnsubscribe = window.api.updater.onDownloadProgress((progress) => {
      progressPercent.value = Math.round(progress.percent);
    });
  }
}

async function runStartupCheck(): Promise<void> {
  if (!capability.value?.supported) {
    return;
  }

  if (!(await loadAutoUpdateOnStartup())) {
    return;
  }

  await runCheck(false);
}

async function checkForUpdatesManually(): Promise<void> {
  await runCheck(true);
}

async function runCheck(manual: boolean): Promise<void> {
  if (!capability.value?.supported) {
    return;
  }

  status.value = "checking";
  errorMessage.value = null;

  try {
    const result = await window.api.updater.check();

    if (result.available && result.version) {
      // On startup, honor a previously skipped version silently. A manual check
      // always surfaces the update.
      if (!manual && (await loadSkippedUpdateVersion()) === result.version) {
        status.value = "idle";
        return;
      }

      availableVersion.value = result.version;
      status.value = "available";
      dialogOpen.value = true;
      return;
    }

    status.value = "uptodate";

    if (manual) {
      resultMessage.value = "You're on the latest version.";
      resultSnackbar.value = true;
    }
  } catch (caughtError) {
    status.value = "error";
    errorMessage.value =
      caughtError instanceof Error
        ? caughtError.message
        : "The update check could not be completed.";

    if (manual) {
      resultMessage.value = errorMessage.value;
      resultSnackbar.value = true;
    }
  }
}

async function downloadAndInstall(): Promise<void> {
  status.value = "downloading";
  progressPercent.value = 0;
  errorMessage.value = null;

  try {
    // On success the app quits and relaunches onto the new version, so this
    // promise typically never resolves in the renderer.
    await window.api.updater.downloadAndInstall();
  } catch (caughtError) {
    status.value = "error";
    dialogOpen.value = false;
    errorMessage.value =
      caughtError instanceof Error
        ? caughtError.message
        : "The update could not be installed.";
    resultMessage.value = errorMessage.value;
    resultSnackbar.value = true;
  }
}

function remindLater(): void {
  dialogOpen.value = false;
  status.value = "idle";
}

async function skipThisVersion(): Promise<void> {
  if (availableVersion.value) {
    await saveSkippedUpdateVersion(availableVersion.value);
  }

  dialogOpen.value = false;
  status.value = "idle";
}

export function useAppUpdater() {
  return {
    capability,
    status,
    availableVersion,
    progressPercent,
    errorMessage,
    dialogOpen,
    resultSnackbar,
    resultMessage,
    initUpdater,
    runStartupCheck,
    checkForUpdatesManually,
    downloadAndInstall,
    remindLater,
    skipThisVersion
  };
}
