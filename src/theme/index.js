import typography from "./typography";
import { createTheme } from "@mui/material/styles";

// single place to change the accent color of the whole UI
const ACCENT = "#FFFFFF";

const theme = createTheme({
  typography,
  shape: { borderRadius: 14 },
  palette: {
    mode: "dark",
    primary: {
      main: ACCENT,
      light: "#FFFFFF",
      dark: "#D4D4D4",
      contrastText: "#0A0A0A",
    },
    background: { default: "#0A0A0A", paper: "#111111" },
    text: { primary: "#EDEDED", secondary: "#8A8A8A" },
    divider: "rgba(255,255,255,0.08)",
  },
  components: {
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 12 },
        outlined: {
          borderColor: "rgba(255,255,255,0.14)",
          "&:hover": { backgroundColor: "rgba(255,255,255,0.04)" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { backgroundColor: "transparent", backgroundImage: "none" },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { height: 4 },
        rail: { opacity: 0.2 },
        thumb: { boxShadow: "none" },
      },
    },
    MuiCheckbox: {
      defaultProps: { size: "small" },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#1C1C1C",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
        },
        arrow: { color: "#1C1C1C" },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 24 } },
    },
  },
});

export default theme;
