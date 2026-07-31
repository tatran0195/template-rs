const KEY = "theme";

export function getTheme(): "light" | "dark" {
  const saved = localStorage.getItem(KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(KEY, theme);
}

export function initTheme() {
  applyTheme(getTheme());
}

export function toggleTheme(): "light" | "dark" {
  const next = getTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

export function isDark() {
  return document.documentElement.classList.contains("dark");
}
