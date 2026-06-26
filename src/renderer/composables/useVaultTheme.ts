import { computed, ref, watch } from "vue";
import { useTheme } from "vuetify";
import { repositories } from "../repositories";

export interface VaultThemeOption {
  name: VaultThemeName;
  label: string;
  dark: boolean;
}

export const VAULT_THEMES = [
  { name: "vaultLight", label: "Vault Light", dark: false },
  { name: "vaultDark", label: "Vault Dark", dark: true },
  { name: "slateDark", label: "Slate Dark", dark: true },
  { name: "midnightDark", label: "Midnight Dark", dark: true },
  { name: "plumDark", label: "Plum Dark", dark: true },
  { name: "githubDark", label: "GitHub Dark", dark: true }
] as const satisfies readonly VaultThemeOption[];

export type VaultThemeName =
  | "vaultLight"
  | "vaultDark"
  | "slateDark"
  | "midnightDark"
  | "plumDark"
  | "githubDark";

function getThemeOption(name: VaultThemeName): VaultThemeOption {
  return VAULT_THEMES.find((theme) => theme.name === name) ?? VAULT_THEMES[0];
}

const THEME_SETTING_KEY = "theme";
const THEME_STORAGE_KEY = "esp-board-vault.theme";
const currentTheme = ref<VaultThemeName>(getInitialTheme());
let themeWatchRegistered = false;
let settingsHydrationStarted = false;
let settingsHydrated = false;
let themeChangedBeforeHydration = false;

export function useVaultTheme() {
  const theme = useTheme();

  if (!themeWatchRegistered) {
    watch(
      currentTheme,
      (themeName) => {
        applyThemePreference(theme, themeName);
        persistThemePreferenceToLocalStorage(themeName);

        if (settingsHydrated) {
          void persistThemePreferenceBestEffort(themeName);
        }
      },
      { immediate: true }
    );

    themeWatchRegistered = true;
    hydrateThemePreferenceFromSettings();
  } else {
    applyThemePreference(theme, currentTheme.value);
  }

  const isDarkTheme = computed(() => getThemeOption(currentTheme.value).dark);
  const themeLabel = computed(() => getThemeOption(currentTheme.value).label);

  function setTheme(themeName: VaultThemeName): void {
    markThemeChangedBeforeHydration();
    currentTheme.value = themeName;
  }

  async function persistCurrentTheme(): Promise<void> {
    persistThemePreferenceToLocalStorage(currentTheme.value);
    await persistThemePreference(currentTheme.value);
  }

  return {
    currentTheme,
    isDarkTheme,
    persistCurrentTheme,
    themeLabel,
    setTheme,
    themes: VAULT_THEMES
  };
}

function applyThemePreference(
  theme: ReturnType<typeof useTheme>,
  themeName: VaultThemeName
): void {
  theme.change(themeName);
  document.documentElement.dataset.vaultTheme = getThemeOption(themeName).dark
    ? "dark"
    : "light";
}

function hydrateThemePreferenceFromSettings(): void {
  if (settingsHydrationStarted) {
    return;
  }

  settingsHydrationStarted = true;

  void (async () => {
    try {
      const storedTheme = normalizeThemeName(
        (await repositories.appSettings.get(THEME_SETTING_KEY))?.value
      );

      if (storedTheme && !themeChangedBeforeHydration) {
        currentTheme.value = storedTheme;
      }
    } catch {
      // Dexie-backed settings are best effort; localStorage/system fallback still applies.
    } finally {
      settingsHydrated = true;
      void persistThemePreferenceBestEffort(currentTheme.value);
    }
  })();
}

function markThemeChangedBeforeHydration(): void {
  if (!settingsHydrated) {
    themeChangedBeforeHydration = true;
  }
}

async function persistThemePreferenceBestEffort(
  themeName: VaultThemeName
): Promise<void> {
  try {
    await persistThemePreference(themeName);
  } catch {
    // The selected theme still applies even if persistence fails.
  }
}

async function persistThemePreference(themeName: VaultThemeName): Promise<void> {
  await repositories.appSettings.set(THEME_SETTING_KEY, themeName);
}

function persistThemePreferenceToLocalStorage(themeName: VaultThemeName): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeName);
  } catch {
    // Theme persistence is best effort. The selected theme still applies.
  }
}

function getInitialTheme(): VaultThemeName {
  try {
    const storedTheme = normalizeThemeName(
      window.localStorage.getItem(THEME_STORAGE_KEY)
    );

    if (storedTheme) {
      return storedTheme;
    }
  } catch {
    // Fall through to the system preference.
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "vaultDark"
    : "vaultLight";
}

function normalizeThemeName(value: unknown): VaultThemeName | null {
  if (value === "light") {
    return "vaultLight";
  }

  if (value === "dark") {
    return "vaultDark";
  }

  return VAULT_THEMES.some((theme) => theme.name === value)
    ? (value as VaultThemeName)
    : null;
}
