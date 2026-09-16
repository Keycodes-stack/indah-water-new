/* Theme management helper for Light (White) and Dark UI themes */

const THEME_KEY = "iwk_theme";

export function getStoredTheme() {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  // Default to system preference if set, otherwise light
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const targetTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", targetTheme);
  localStorage.setItem(THEME_KEY, targetTheme);
}

export function initTheme() {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
}
