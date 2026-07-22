import { useEffect, useState } from "react";

/**
 * Header theme picker. Ten style variants live in themes.css, activated by
 * `data-theme` on <html>.
 *
 * Initial theme is chosen pre-paint by the inline script in root.tsx (which
 * shares THEME_IDS / STORAGE_KEY below), in this order:
 *   1. `?theme=<id>` URL param (deep-link / share a specific look)
 *   2. a saved preference in localStorage
 *   3. otherwise a random theme — re-rolled every visit until one is chosen
 * Only an explicit pick here is saved; the random default is never persisted.
 */

export const STORAGE_KEY = "styleTheme";

export const THEMES = [
  { id: "", label: "Default" },
  { id: "editorial", label: "Editorial" },
  { id: "terminal", label: "Terminal" },
  { id: "brutalist", label: "Brutalist" },
  { id: "aurora", label: "Aurora" },
  { id: "blueprint", label: "Blueprint" },
  { id: "synthwave", label: "Synthwave" },
  { id: "swiss", label: "Swiss" },
  { id: "nord", label: "Nord" },
  { id: "notebook", label: "Notebook" },
  { id: "ink", label: "Ink" },
] as const;

/** Real themes only (excludes the "" Default) — the pool for the random pick. */
export const THEME_IDS = THEMES.map((t) => t.id).filter(Boolean);

function apply(id: string) {
  const root = document.documentElement;
  if (id) root.dataset.theme = id;
  else delete root.dataset.theme;
}

export function ThemeSwitcher() {
  // "" until mounted, then synced to whatever the pre-paint script applied.
  const [active, setActive] = useState("");

  useEffect(() => {
    setActive(document.documentElement.dataset.theme ?? "");
  }, []);

  function choose(id: string) {
    apply(id);
    setActive(id);
    // Persist every explicit choice (including "" Default) so it sticks.
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Storage may be unavailable (private mode); the pick still applies.
    }
  }

  return (
    <div className="theme-switcher">
      <span className="theme-switcher-label" aria-hidden="true">
        Theme
      </span>
      <select
        aria-label="Theme"
        value={active}
        onChange={(e) => choose(e.target.value)}
      >
        {THEMES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      <span className="theme-switcher-ai">by ai</span>
    </div>
  );
}
