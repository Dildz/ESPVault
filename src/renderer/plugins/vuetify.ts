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
          background: "#f7f8f5",
          surface: "#ffffff",
          primary: "#226f54",
          secondary: "#425466",
          accent: "#c46d2d",
          error: "#b3261e",
          warning: "#a75d12",
          info: "#36618e",
          success: "#2f7d32"
        }
      }
    }
  },
  defaults: {
    VBtn: {
      rounded: "sm"
    },
    VCard: {
      rounded: "sm"
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
