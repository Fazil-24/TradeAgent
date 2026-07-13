import { createTheme, type ThemeOptions } from "@mui/material/styles";

const BRAND = "#1A6FA8";
const BRAND_LIGHT = "#4A94C7";
const BRAND_DARK = "#0F4C72";

const baseOptions: ThemeOptions = {
  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "Helvetica Neue",
      "Arial",
      "sans-serif",
    ].join(","),
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: "none" },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: "10px 20px",
          transition: "transform 120ms ease",
          "&:active": {
            transform: "scale(0.97)",
          },
        },
        containedPrimary: {
          boxShadow: "0 4px 14px rgba(26, 111, 168, 0.3)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          transition: "transform 200ms ease, box-shadow 200ms ease",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
        },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...baseOptions,
  palette: {
    mode: "light",
    primary: { main: BRAND, light: BRAND_LIGHT, dark: BRAND_DARK, contrastText: "#fff" },
    secondary: { main: "#F5A623" },
    background: { default: "#F7FAFC", paper: "#FFFFFF" },
    text: { primary: "#1A2331", secondary: "#5C6B7A" },
    success: { main: "#2E9E5B" },
    error: { main: "#D64545" },
    warning: { main: "#E8A33D" },
    divider: "#E4E9EF",
  },
});

export const darkTheme = createTheme({
  ...baseOptions,
  palette: {
    mode: "dark",
    primary: { main: BRAND_LIGHT, light: "#7BB4DC", dark: BRAND, contrastText: "#0A1017" },
    secondary: { main: "#F5A623" },
    background: { default: "#121212", paper: "#1E1E1E" },
    text: { primary: "#EDEFF2", secondary: "#A6AEB8" },
    success: { main: "#4CBB7C" },
    error: { main: "#E57373" },
    warning: { main: "#EBB563" },
    divider: "#2C2C2C",
  },
});

export const BRAND_COLOR = BRAND;
