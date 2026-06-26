import { repositories } from "../repositories";

export const AUTO_UPDATE_ON_STARTUP_SETTING_KEY = "autoUpdateOnStartup";
export const SKIPPED_UPDATE_VERSION_SETTING_KEY = "skippedUpdateVersion";
export const DEFAULT_AUTO_UPDATE_ON_STARTUP = false;

export async function loadAutoUpdateOnStartup(): Promise<boolean> {
  const setting = await repositories.appSettings.get(
    AUTO_UPDATE_ON_STARTUP_SETTING_KEY
  );

  return normalizeAutoUpdateOnStartup(setting?.value);
}

export async function saveAutoUpdateOnStartup(value: boolean): Promise<boolean> {
  const enabled = value === true;
  await repositories.appSettings.set(AUTO_UPDATE_ON_STARTUP_SETTING_KEY, enabled);
  return enabled;
}

export function normalizeAutoUpdateOnStartup(value: unknown): boolean {
  return typeof value === "boolean" ? value : DEFAULT_AUTO_UPDATE_ON_STARTUP;
}

export async function loadSkippedUpdateVersion(): Promise<string | null> {
  const setting = await repositories.appSettings.get(
    SKIPPED_UPDATE_VERSION_SETTING_KEY
  );

  return typeof setting?.value === "string" ? setting.value : null;
}

export async function saveSkippedUpdateVersion(
  version: string | null
): Promise<void> {
  await repositories.appSettings.set(SKIPPED_UPDATE_VERSION_SETTING_KEY, version);
}
