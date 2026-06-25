import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { aliases, mdi } from "vuetify/iconsets/mdi";

export const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: {
      mdi
    }
  },
  theme: {
    defaultTheme: "vaultLight",
    themes: {
      vaultLight: {
        dark: false,
        colors: {
          background: "#f3f7f4",
          surface: "#ffffff",
          "surface-bright": "#ffffff",
          "surface-variant": "#e7eee8",
          primary: "#08745e",
          secondary: "#3f5667",
          accent: "#d5751f",
          error: "#ba1a1a",
          warning: "#a15c00",
          info: "#0e6d9f",
          success: "#1f7a43"
        }
      },
      vaultDark: {
        dark: true,
        colors: {
          background: "#111816",
          surface: "#17211f",
          "surface-bright": "#22302d",
          "surface-variant": "#263a35",
          primary: "#42d6b5",
          secondary: "#a7bac5",
          accent: "#ffb25f",
          error: "#ffb4ab",
          warning: "#f6bd62",
          info: "#8fcfff",
          success: "#7bdc9b"
        }
      },
      paperLight: {
        dark: false,
        colors: {
          background: "#f6f5f2",
          surface: "#ffffff",
          "surface-bright": "#ffffff",
          "surface-variant": "#ece9e3",
          primary: "#466d8f",
          secondary: "#5f5a52",
          accent: "#c4621a",
          error: "#ba1a1a",
          warning: "#a15c00",
          info: "#0e6d9f",
          success: "#1f7a43"
        }
      },
      slateDark: {
        dark: true,
        colors: {
          background: "#14171a",
          surface: "#1b1f24",
          "surface-bright": "#262c33",
          "surface-variant": "#2c333b",
          primary: "#9bb1c9",
          secondary: "#aab4bf",
          accent: "#e0a96d",
          error: "#ffb4ab",
          warning: "#f6bd62",
          info: "#8fcfff",
          success: "#7bdc9b"
        }
      },
      midnightDark: {
        dark: true,
        colors: {
          background: "#0f1626",
          surface: "#161f33",
          "surface-bright": "#1f2c49",
          "surface-variant": "#233152",
          primary: "#5b9bff",
          secondary: "#9fb2d0",
          accent: "#ffb86c",
          error: "#ffb4ab",
          warning: "#f6bd62",
          info: "#8fcfff",
          success: "#7bdc9b"
        }
      },
      plumDark: {
        dark: true,
        colors: {
          background: "#181221",
          surface: "#211a2e",
          "surface-bright": "#2e2440",
          "surface-variant": "#342847",
          primary: "#c08cf0",
          secondary: "#b9a7cf",
          accent: "#f4a9d4",
          error: "#ffb4ab",
          warning: "#f6bd62",
          info: "#8fcfff",
          success: "#7bdc9b"
        }
      },
      githubDark: {
        dark: true,
        colors: {
          background: "#0d1117",
          surface: "#161b22",
          "surface-bright": "#21262d",
          "surface-variant": "#262c36",
          primary: "#58a6ff",
          secondary: "#8b949e",
          accent: "#d29922",
          error: "#f85149",
          warning: "#d29922",
          info: "#58a6ff",
          success: "#3fb950"
        }
      }
    }
  },
  defaults: {
    VBtn: {
      rounded: "lg"
    },
    VCard: {
      rounded: "lg"
    },
    VTextField: {
      density: "comfortable",
      variant: "outlined"
    },
    VTextarea: {
      density: "comfortable",
      variant: "outlined"
    },
    VSelect: {
      density: "comfortable",
      variant: "outlined"
    }
  }
});
