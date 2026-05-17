import { computed, ref, watch } from "vue";
import { useTheme } from "vuetify";

export type VaultThemeName = "vaultLight" | "vaultDark";

const THEME_STORAGE_KEY = "esp-board-vault.theme";
const currentTheme = ref<VaultThemeName>(getInitialTheme());
let themeWatchRegistered = false;

export function useVaultTheme() {
  const theme = useTheme();

  if (!themeWatchRegistered) {
    watch(
      currentTheme,
      (themeName) => {
        theme.global.name.value = themeName;
        document.documentElement.dataset.vaultTheme =
          themeName === "vaultDark" ? "dark" : "light";

        try {
          window.localStorage.setItem(THEME_STORAGE_KEY, themeName);
        } catch {
          // Theme persistence is best effort. The selected theme still applies.
        }
      },
      { immediate: true }
    );

    themeWatchRegistered = true;
  } else {
    theme.global.name.value = currentTheme.value;
  }

  const isDarkTheme = computed(() => currentTheme.value === "vaultDark");
  const themeLabel = computed(() =>
    isDarkTheme.value ? "Dark mode" : "Light mode"
  );

  function setTheme(themeName: VaultThemeName): void {
    currentTheme.value = themeName;
  }

  function toggleTheme(): void {
    currentTheme.value = isDarkTheme.value ? "vaultLight" : "vaultDark";
  }

  return {
    currentTheme,
    isDarkTheme,
    themeLabel,
    setTheme,
    toggleTheme
  };
}

function getInitialTheme(): VaultThemeName {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "vaultLight" || storedTheme === "vaultDark") {
      return storedTheme;
    }
  } catch {
    // Fall through to the system preference.
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "vaultDark"
    : "vaultLight";
}
