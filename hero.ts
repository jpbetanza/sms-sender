import { heroui } from "@heroui/theme";

export default heroui({
  themes: {
    light: {
      colors: {
        background: "#F9F6F2",
        foreground: "#2E1E1E",
        primary: { DEFAULT: "#732626", foreground: "#F9F6F2" },
        secondary: { DEFAULT: "#EFEBE6", foreground: "#2E1E1E" },
        focus: "#732626",
        danger: { DEFAULT: "#DC2626", foreground: "#F9F6F2" },
      },
      layout: {
        radius: { small: "0.25rem", medium: "0.5rem", large: "0.75rem" },
      },
    },
    dark: {
      colors: {
        background: "#171111",
        foreground: "#EFECE9",
        primary: { DEFAULT: "#C45454", foreground: "#171111" },
        secondary: { DEFAULT: "#2C2525", foreground: "#EFECE9" },
        focus: "#C45454",
        danger: { DEFAULT: "#DC2626", foreground: "#EFECE9" },
      },
      layout: {
        radius: { small: "0.25rem", medium: "0.5rem", large: "0.75rem" },
      },
    },
  },
});
