export const practiceThemes = ["light", "dark", "system"] as const;
export type PracticeTheme = (typeof practiceThemes)[number];

const storageKey = "pf-theme";
const attribute = "data-practice-theme";

export function readPracticeTheme(): PracticeTheme {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === "dark" || saved === "system") return saved;
  } catch {
    // The default still works when storage is disabled.
  }
  return "light";
}

export function setPracticeTheme(theme: PracticeTheme) {
  document.documentElement.setAttribute(attribute, theme);
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // Apply the choice for the current document even without persistence.
  }
}

// Keep first paint and hydration in the same theme.
export const practiceThemeBootstrap = `(function () {
  var theme = "light";
  try {
    var saved = localStorage.getItem(${JSON.stringify(storageKey)});
    if (saved === "dark" || saved === "system") theme = saved;
  } catch {}
  document.documentElement.setAttribute(${JSON.stringify(attribute)}, theme);
})();`;
