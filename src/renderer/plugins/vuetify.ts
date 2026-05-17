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
